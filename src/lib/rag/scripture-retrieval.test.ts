/**
 * src/lib/rag/scripture-retrieval.test.ts
 *
 * Unit tests for the scripture retrieval module.
 * Uses vi.mock to avoid real DB / AI provider calls.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock dependencies before importing the module ────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    retrievalLog: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  aiProvider: {
    embedText: vi.fn().mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
    }),
  },
}));

vi.mock("@/lib/ingestion/vector", () => ({
  toPgVectorLiteral: (embedding: number[]) =>
    `[${embedding.slice(0, 3).join(",")},...]`,
}));

// Import after mocks
import { db } from "@/lib/db";
import {
  retrieveScriptureContext,
  formatScriptureContextForPrompt,
} from "@/lib/rag/scripture-retrieval";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockGitaChunk = {
  id: "chunk-gita-247",
  canonicalRef: "2.47",
  sourceTitle: "Bhagavad Gita",
  sourcePriority: 10,
  translation:
    "You have a right to perform your duties, but not to the fruits of those actions.",
  commentary: "This is the central teaching of Karma Yoga.",
  practicalNote:
    "Act with sincerity; release the outcome. Begin with the right action.",
  personaTags: ["krishna"],
  themeTags: ["karma", "duty"],
  score: 0.91,
};

const mockShivaChunk = {
  id: "chunk-shiva-1",
  canonicalRef: "1.1",
  sourceTitle: "Shiva Purana",
  sourcePriority: 8,
  translation: "In the beginning, Shiva was alone in the formless void.",
  commentary: "The primordial state before creation.",
  practicalNote: "Contemplate the silence before thought.",
  personaTags: ["shiva"],
  themeTags: ["creation", "silence", "void"],
  score: 0.85,
};

// Variant that returns 2 chunks to avoid triggering fallback
function setupQueryRawPersonaWithTwo(chunk: typeof mockGitaChunk) {
  (db.$queryRaw as Mock).mockResolvedValueOnce([
    chunk,
    {
      ...chunk,
      id: chunk.id + "-b",
      canonicalRef: chunk.canonicalRef + ".b",
    },
  ]); // vector
  (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]); // keyword
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("retrieveScriptureContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result for empty query", async () => {
    const result = await retrieveScriptureContext({
      query: "   ",
      personaId: "krishna",
    });

    expect(result.chunks).toHaveLength(0);
    expect(result.citations).toHaveLength(0);
    expect(result.usedFallback).toBe(false);
    // Should not have called the DB
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("returns persona-filtered chunks for a matching query", async () => {
    setupQueryRawPersonaWithTwo(mockGitaChunk);

    const result = await retrieveScriptureContext({
      query: "What does Krishna say about karma?",
      personaId: "krishna",
    });

    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    expect(result.chunks[0]!.sourceTitle).toBe("Bhagavad Gita");
    expect(result.personaId).toBe("krishna");
  });

  it("builds citations from retrieved chunks", async () => {
    setupQueryRawPersonaWithTwo(mockGitaChunk);

    const result = await retrieveScriptureContext({
      query: "karma and duty",
      personaId: "krishna",
    });

    expect(result.citations.length).toBeGreaterThanOrEqual(1);
    expect(result.citations[0]!.ref).toContain("Bhagavad Gita");
    expect(result.citations[0]!.source).toBe("Bhagavad Gita");
  });

  it("does not cross-contaminate Shiva persona with Krishna chunks", async () => {
    // Shiva persona query: returns 2 shiva chunks
    (db.$queryRaw as Mock).mockResolvedValueOnce([
      mockShivaChunk,
      { ...mockShivaChunk, id: "shiva-2", canonicalRef: "1.2" },
    ]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    const result = await retrieveScriptureContext({
      query: "Tell me about the void before creation",
      personaId: "shiva",
    });

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]!.personaTags).toContain("shiva");
    expect(result.chunks[0]!.personaTags).not.toContain("krishna");
  });

  it("sets usedFallback to true when persona filter returns insufficient results", async () => {
    // First call (persona-filtered): returns only 1 result (< MIN_PERSONA_RESULTS=2)
    (db.$queryRaw as Mock)
      .mockResolvedValueOnce([mockShivaChunk]) // sparse persona result
      .mockResolvedValueOnce([mockGitaChunk, mockShivaChunk]); // global fallback
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]); // keyword

    const result = await retrieveScriptureContext({
      query: "obscure philosophical question",
      personaId: "sita",
    });

    expect(result.usedFallback).toBe(true);
  });

  it("returns keyword-only scripture matches when vector search finds nothing", async () => {
    (db.$queryRaw as Mock)
      .mockResolvedValueOnce([]) // sparse persona vector result
      .mockResolvedValueOnce([]); // sparse global vector result
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([
      { ...mockGitaChunk, keywordRank: 0.42 },
    ]);

    const result = await retrieveScriptureContext({
      query: "karma duty fruits actions",
      personaId: "krishna",
    });

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]!.id).toBe(mockGitaChunk.id);
    expect(result.chunks[0]!.vectorScore).toBe(0);
    expect(result.chunks[0]!.keywordRank).toBe(0.42);
    expect(result.citations[0]!.ref).toBe("Bhagavad Gita 2.47");
  });

  it("uses source priority to break otherwise similar retrieval scores", async () => {
    const lowerPriorityChunk = {
      ...mockGitaChunk,
      id: "chunk-low-priority",
      canonicalRef: "2.48",
      sourcePriority: 3,
      score: 0.9,
    };

    const higherPriorityChunk = {
      ...mockGitaChunk,
      id: "chunk-high-priority",
      canonicalRef: "2.49",
      sourcePriority: 10,
      score: 0.9,
    };

    (db.$queryRaw as Mock).mockResolvedValueOnce([
      lowerPriorityChunk,
      higherPriorityChunk,
    ]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    const result = await retrieveScriptureContext({
      query: "karma and duty",
      personaId: "krishna",
    });

    expect(result.chunks[0]!.id).toBe("chunk-high-priority");
  });

  it("boosts requested scripture themes without hiding other matches", async () => {
    const bhaktiChunk = {
      ...mockGitaChunk,
      id: "chunk-bhakti",
      canonicalRef: "9.22",
      themeTags: ["bhakti", "surrender"],
      score: 0.88,
    };

    const karmaChunk = {
      ...mockGitaChunk,
      id: "chunk-karma",
      canonicalRef: "2.47",
      themeTags: ["karma", "duty"],
      score: 0.92,
    };

    (db.$queryRaw as Mock).mockResolvedValueOnce([karmaChunk, bhaktiChunk]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    const result = await retrieveScriptureContext({
      query: "how do I surrender",
      personaId: "krishna",
      themes: ["bhakti"],
    });

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]!.id).toBe("chunk-bhakti");
  });

  it("includes debug info when debugMode is true", async () => {
    setupQueryRawPersonaWithTwo(mockGitaChunk);

    const result = await retrieveScriptureContext({
      query: "What is duty?",
      personaId: "krishna",
      debugMode: true,
    });

    expect(result.debug).toBeDefined();
    expect(typeof result.debug!.totalMs).toBe("number");
    expect(typeof result.debug!.vectorSearchMs).toBe("number");
    expect(Array.isArray(result.debug!.sourceFilter)).toBe(true);
  });

  it("respects the limit parameter", async () => {
    const manyChunks = Array.from({ length: 10 }, (_, i) => ({
      ...mockGitaChunk,
      id: `chunk-${i}`,
      canonicalRef: `2.${i}`,
      score: 0.9 - i * 0.05,
    }));

    (db.$queryRaw as Mock).mockResolvedValueOnce(manyChunks);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    const result = await retrieveScriptureContext({
      query: "karma and action",
      personaId: "krishna",
      limit: 3,
    });

    expect(result.chunks.length).toBeLessThanOrEqual(3);
  });

  it("uses review and source eligibility filters in voice mode", async () => {
    (db.$queryRaw as Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    const result = await retrieveScriptureContext({
      query: "karma and action",
      personaId: "krishna",
      mode: "voice",
    });

    const vectorSql = (db.$queryRaw as Mock).mock.calls
      .map((call) => Array.from(call[0] as TemplateStringsArray).join(""))
      .join("\n");
    const keywordSql = String((db.$queryRawUnsafe as Mock).mock.calls[0][0]);

    expect(vectorSql).toContain('"ScriptureChunkReview"');
    expect(vectorSql).toContain('"approvedForVoice" = true');
    expect(vectorSql).toContain('"active" = true');
    expect(keywordSql).toContain('"ScriptureChunkReview"');
    expect(result.insufficientApprovedContext).toBe(true);
    expect(result.chunks).toHaveLength(0);
  });

  it("handles DB errors gracefully — returns empty result", async () => {
    (db.$queryRaw as Mock).mockRejectedValue(new Error("DB connection lost"));

    // Should not throw
    await expect(
      retrieveScriptureContext({
        query: "What is dharma?",
        personaId: "rama",
      }),
    ).resolves.toBeDefined();
  });
});

describe("formatScriptureContextForPrompt", () => {
  it("returns empty string when no chunks", () => {
    const result = formatScriptureContextForPrompt({
      chunks: [],
      citations: [],
      personaId: "krishna",
      mode: "text",
      usedFallback: false,
      insufficientContext: true,
      insufficientApprovedContext: false,
    });
    expect(result).toBe("");
  });

  it("formats chunk with numbered reference", () => {
    const result = formatScriptureContextForPrompt({
      chunks: [
        {
          ...mockGitaChunk,
          vectorScore: 0.91,
          keywordRank: 0,
        },
      ],
      citations: [{ ref: "Bhagavad Gita 2.47", source: "Bhagavad Gita" }],
      personaId: "krishna",
      mode: "text",
      usedFallback: false,
      insufficientContext: false,
      insufficientApprovedContext: false,
    });

    expect(result).toContain("[1] Bhagavad Gita 2.47");
    expect(result).toContain("Translation:");
    expect(result).toContain("You have a right to perform your duties");
  });

  it("includes commentary when present", () => {
    const result = formatScriptureContextForPrompt({
      chunks: [{ ...mockGitaChunk, vectorScore: 0.9, keywordRank: 0 }],
      citations: [],
      personaId: "krishna",
      mode: "text",
      usedFallback: false,
      insufficientContext: false,
      insufficientApprovedContext: false,
    });

    expect(result).toContain("Commentary:");
    expect(result).toContain("Karma Yoga");
  });

  it("includes practical note when present", () => {
    const result = formatScriptureContextForPrompt({
      chunks: [{ ...mockGitaChunk, vectorScore: 0.9, keywordRank: 0 }],
      citations: [],
      personaId: "krishna",
      mode: "text",
      usedFallback: false,
      insufficientContext: false,
      insufficientApprovedContext: false,
    });

    expect(result).toContain("Application:");
    expect(result).toContain("Act with sincerity");
  });
});

// ── Voice-mode retrieval security tests ──────────────────────────────────────
// These tests verify the SQL-level gating: only approved+approvedForVoice
// chunks should ever be returned in voice mode.

describe("retrieveScriptureContext — voice-mode security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("text mode requires approved active legal text without the voice-only approval filter", async () => {
    (db.$queryRaw as Mock)
      .mockResolvedValueOnce([
        mockGitaChunk,
        { ...mockGitaChunk, id: "b", canonicalRef: "2.48" },
      ])
      .mockResolvedValueOnce([]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    await retrieveScriptureContext({
      query: "karma and duty",
      personaId: "krishna",
      mode: "text",
    });

    const vectorSql = (db.$queryRaw as Mock).mock.calls
      .map((call) => Array.from(call[0] as TemplateStringsArray).join(""))
      .join("\n");

    // Text mode must be reviewed/legal/active but must not require voice approval.
    expect(vectorSql).toContain('"ScriptureChunkReview"');
    expect(vectorSql).toContain("\"reviewStatus\" = 'approved'");
    expect(vectorSql).toContain('"active" = true');
    expect(vectorSql).toContain('"copyrightStatus" = ANY');
    expect(vectorSql).not.toContain('"approvedForVoice" = true');
  });

  it("voice mode returns insufficientApprovedContext=true when there are zero approved-for-voice chunks", async () => {
    // Both vector and keyword return empty (no approved chunks)
    (db.$queryRaw as Mock)
      .mockResolvedValueOnce([]) // persona vector search — empty
      .mockResolvedValueOnce([]); // global fallback vector — empty
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]); // keyword — empty

    const result = await retrieveScriptureContext({
      query: "What is dharma and duty?",
      personaId: "krishna",
      mode: "voice",
    });

    expect(result.chunks).toHaveLength(0);
    expect(result.citations).toHaveLength(0);
    expect(result.insufficientApprovedContext).toBe(true);
    expect(result.insufficientContext).toBe(true);
    expect(result.mode).toBe("voice");
  });

  it("voice mode SQL includes INNER JOIN ScriptureChunkReview with approvedForVoice=true and active=true", async () => {
    (db.$queryRaw as Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    (db.$queryRawUnsafe as Mock).mockResolvedValueOnce([]);

    await retrieveScriptureContext({
      query: "karma and action",
      personaId: "krishna",
      mode: "voice",
    });

    const allVectorSql = (db.$queryRaw as Mock).mock.calls
      .map((call) => Array.from(call[0] as TemplateStringsArray).join(""))
      .join("\n");
    const keywordSql = String((db.$queryRawUnsafe as Mock).mock.calls[0]![0]);

    // Both vector and keyword SQL must gate on approved voice content
    expect(allVectorSql).toContain('"ScriptureChunkReview"');
    expect(allVectorSql).toContain('"approvedForVoice" = true');
    expect(allVectorSql).toContain('"active" = true');
    expect(allVectorSql).toContain("\"reviewStatus\" = 'approved'");
    expect(keywordSql).toContain('"ScriptureChunkReview"');
  });
});
