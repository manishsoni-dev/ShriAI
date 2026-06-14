import "server-only";

import { aiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { toPgVectorLiteral } from "@/lib/ingestion/vector";
import { logObservabilityEvent } from "@/lib/observability";
import type { PersonaId } from "@/lib/personas";
import { buildScriptureKeywordQuery } from "@/lib/rag/retrieval-query";
import { getActiveExperimentConfig } from "@/lib/rag/experiment-config";

// ── Persona → primary source filter ──────────────────────────────────────────
// Soft filter: if persona-specific retrieval returns < MIN_PERSONA_RESULTS,
// the query falls back to global retrieval without persona filter.

const PERSONA_SOURCE_MAP: Record<PersonaId, string[]> = {
  krishna: ["Bhagavad Gita", "Bhagavata Purana", "Garga Samhita"],
  rama: ["Valmiki Ramayana", "Ramcharitmanas", "Adhyatma Ramayana"],
  shiva: ["Shiva Purana", "Ishvara Gita", "Linga Purana"],
  hanuman: ["Sundara Kanda", "Hanuman Chalisa", "Muktika Upanishad"],
  sita: ["Valmiki Ramayana", "Sita Upanishad", "Adhyatma Ramayana"],
  radha: ["Garga Samhita", "Brahma Vaivarta Purana"],
};

const MIN_PERSONA_RESULTS = 2; // If fewer than this, broaden to global
const ALLOWED_COPYRIGHT_STATUSES = [
  "public_domain",
  "public-domain",
  "licensed",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScriptureChunkResult = {
  id: string;
  canonicalRef: string;
  sourceTitle: string;
  sourcePriority: number;
  translation: string;
  commentary: string | null;
  practicalNote: string | null;
  personaTags: string[];
  themeTags: string[];
  /** Combined hybrid score from vector similarity, keyword rank, and source priority. */
  score: number;
  vectorScore: number;
  keywordRank: number;
};

export type ScriptureRetrievalResult = {
  chunks: ScriptureChunkResult[];
  citations: Array<{ ref: string; source: string }>;
  personaId: PersonaId;
  mode: ScriptureRetrievalMode;
  usedFallback: boolean;
  insufficientContext: boolean;
  insufficientApprovedContext: boolean;
  /** Debug info — only populated when debugMode is true */
  debug?: {
    queryEmbeddingMs: number;
    vectorSearchMs: number;
    keywordSearchMs: number;
    totalMs: number;
    sourceFilter: string[];
    retrievedCount: number;
    vectorCandidates: number;
    keywordCandidates: number;
    mergedCandidates: number;
    filteredCandidates: number;
    rerankedCandidates: number;
  };
};

export type ScriptureRetrievalMode = "text" | "voice";

export type RetrieveScriptureContextInput = {
  query: string;
  personaId: PersonaId;
  /** Text preserves broad retrieval; voice enforces human approved content. */
  mode?: ScriptureRetrievalMode;
  /** Number of chunks to return (default: 6, max: 12) */
  limit?: number;
  /** Optional thematic preference for reranking, e.g. ["karma", "grief"]. */
  themes?: string[];
  /** Enable detailed debug metadata in the result */
  debugMode?: boolean;
  /** Minimum score threshold. Results below this are discarded. */
  threshold?: number;
  /** Optional trace id for voice/chat observability. */
  traceId?: string;
  userId?: string;
  conversationId?: string;
};

// ── Raw query row types ───────────────────────────────────────────────────────

type ScriptureRowBase = {
  id: string;
  canonicalRef: string;
  sourceTitle: string;
  sourcePriority: number;
  translation: string;
  commentary: string | null;
  practicalNote: string | null;
  personaTags: string[];
  themeTags: string[];
  answerUseCases?: string[];
};

type VectorRow = ScriptureRowBase & {
  score: number;
};

type KeywordRow = ScriptureRowBase & {
  keywordRank: number;
};

// ── Core retrieval function ───────────────────────────────────────────────────

export async function retrieveScriptureContext(
  input: RetrieveScriptureContextInput,
): Promise<ScriptureRetrievalResult> {
  const t0 = Date.now();
  const limit = Math.min(input.limit ?? 6, 12);
  const query = input.query.trim();
  const mode = input.mode ?? "text";

  if (!query) {
    return emptyResult(input.personaId, mode);
  }

  try {
    return await retrieveScriptureContextInner(input, query, limit, t0, mode);
  } catch (err) {
    console.error("Retrieval error:", err);
    // Never crash the chat request because of retrieval errors
    return emptyResult(input.personaId, mode);
  }
}

async function retrieveScriptureContextInner(
  input: RetrieveScriptureContextInput,
  query: string,
  limit: number,
  t0: number,
  mode: ScriptureRetrievalMode,
): Promise<ScriptureRetrievalResult> {
  const config = getActiveExperimentConfig();
  const vectorLimit = config.vectorCandidateCount;
  const keywordLimit = config.keywordCandidateCount;
  limit = Math.min(limit, config.finalTopK);
  // ── 1. Embed the query ──────────────────────────────────────────────────────
  const t1 = Date.now();
  let queryVector: string;

  try {
    const embedding = await aiProvider.embedText({ text: query });
    queryVector = toPgVectorLiteral(embedding.embedding);
  } catch {
    // If embedding fails (no API key etc.) fall back to keyword-only
    queryVector = "";
  }

  const embeddingMs = Date.now() - t1;

  // ── 2. Vector search with persona tag filter ────────────────────────────────
  const sourceFilter = PERSONA_SOURCE_MAP[input.personaId];
  const t2 = Date.now();

  let vectorRows: VectorRow[] = [];
  let usedFallback = false;

  if (queryVector) {
    vectorRows = await vectorSearchPersona(
      queryVector,
      input.personaId,
      vectorLimit,
      mode,
    );

    if (vectorRows.length < MIN_PERSONA_RESULTS) {
      // Broaden: search all chunks regardless of persona
      usedFallback = true;
      vectorRows = await vectorSearchGlobal(queryVector, vectorLimit, mode);
    }
  }

  const vectorMs = Date.now() - t2;

  const t3 = Date.now();
  const keywordRows = await keywordSearch(
    query,
    input.personaId,
    keywordLimit,
    input.themes,
    mode,
  );
  const keywordMs = Date.now() - t3;

  // ── 4. Merge + rerank ────────────────────────────────────────────────────────
  const merged = mergeAndRerank(vectorRows, keywordRows, limit, input.themes);

  // ── 4.5 Threshold + Deduplication ───────────────────────────────────────────
  let finalChunks = merged.filter((c) => 
    c.score >= config.minimumCombinedScore && 
    (c.vectorScore >= config.minimumVectorScore || c.keywordRank > 0)
  );

  if (config.deduplicateContext) {
    // Deduplicate adjacent/repeated references logically
    const seenRefs = new Set<string>();
    finalChunks = finalChunks.filter((c) => {
      if (seenRefs.has(c.canonicalRef)) return false;
      seenRefs.add(c.canonicalRef);
      return true;
    });
  }

  const insufficientContext = finalChunks.length === 0;
  const insufficientApprovedContext =
    mode === "voice" && finalChunks.length === 0;

  // ── 5. Log retrieval (fire and forget) ─────────────────────────────────────
  const totalMs = Date.now() - t0;
  const retrievedChunkIds = Array.from(
    new Set([...vectorRows.map((r) => r.id), ...keywordRows.map((r) => r.id)]),
  );

  void logRetrieval({
    query,
    personaId: input.personaId,
    retrievedChunkIds,
    selectedChunkIds: finalChunks.map((r) => r.id),
    latencyMs: totalMs,
    sourceFilter,
    resultCount: finalChunks.length,
  });

  if (input.traceId) {
    void logObservabilityEvent({
      traceId: input.traceId,
      eventType: "retrieval",
      status: finalChunks.length > 0 ? "success" : "skipped",
      userId: input.userId,
      conversationId: input.conversationId,
      personaId: input.personaId,
      latencyMs: totalMs,
      payload: {
        queryLength: query.length,
        queryPreview: redactedQueryPreview(query),
        mode,
        sourceFilter,
        usedFallback,
        insufficientContext,
        insufficientApprovedContext,
        retrievedChunkIds,
        selectedChunkIds: finalChunks.map((chunk) => chunk.id),
        scores: finalChunks.map((chunk) => ({
          chunkId: chunk.id,
          canonicalRef: chunk.canonicalRef,
          source: chunk.sourceTitle,
          similarityScore: chunk.vectorScore,
          keywordRank: chunk.keywordRank,
          rerankerScore: chunk.score,
        })),
        experimentConfig: config.id,
      },
    });
  }

  // ── 6. Build result ─────────────────────────────────────────────────────────
  const citations = finalChunks.map((c) => ({
    ref: `${c.sourceTitle} ${c.canonicalRef}`,
    source: c.sourceTitle,
  }));

  return {
    chunks: finalChunks,
    citations,
    personaId: input.personaId,
    mode,
    usedFallback,
    insufficientContext,
    insufficientApprovedContext,
    ...(input.debugMode
      ? {
          debug: {
            queryEmbeddingMs: embeddingMs,
            vectorSearchMs: vectorMs,
            keywordSearchMs: keywordMs,
            totalMs,
            sourceFilter,
            retrievedCount: retrievedChunkIds.length,
            vectorCandidates: vectorRows.length,
            keywordCandidates: keywordRows.length,
            mergedCandidates: merged.length,
            filteredCandidates: finalChunks.length,
            rerankedCandidates: finalChunks.length,
          },
        }
      : {}),
  };
}

// ── Vector search — persona-filtered ─────────────────────────────────────────

async function vectorSearchPersona(
  queryVector: string,
  personaId: PersonaId,
  limit: number,
  mode: ScriptureRetrievalMode,
): Promise<VectorRow[]> {
  if (mode === "voice") {
    return db.$queryRaw<VectorRow[]>`
      SELECT
        sc."id",
        sc."canonicalRef",
        ss."canonicalTitle" AS "sourceTitle",
        ss."priority" AS "sourcePriority",
        sc."translation",
        sc."commentary",
        sc."practicalNote",
        sc."personaTags",
        sc."themeTags",
        1 - (sc."embedding" <=> ${queryVector}::vector) AS "score"
      FROM "ScriptureChunk" sc
      INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
      INNER JOIN "ScriptureChunkReview" scr ON scr."chunkId" = sc."id"
      WHERE
        sc."embedding" IS NOT NULL
        AND sc."personaTags" @> ARRAY[${personaId}]::TEXT[]
        AND scr."reviewStatus" = 'approved'
        AND scr."approvedForVoice" = true
        AND ss."active" = true
        AND ss."copyrightStatus" = ANY(${ALLOWED_COPYRIGHT_STATUSES}::TEXT[])
      ORDER BY sc."embedding" <=> ${queryVector}::vector
      LIMIT ${limit}
    `;
  }

  return db.$queryRaw<VectorRow[]>`
    SELECT
      sc."id",
      sc."canonicalRef",
      ss."canonicalTitle" AS "sourceTitle",
      ss."priority" AS "sourcePriority",
      sc."translation",
      sc."commentary",
      sc."practicalNote",
      sc."personaTags",
      sc."themeTags",
      1 - (sc."embedding" <=> ${queryVector}::vector) AS "score"
    FROM "ScriptureChunk" sc
    INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
    INNER JOIN "ScriptureChunkReview" scr ON scr."chunkId" = sc."id"
    WHERE
      sc."embedding" IS NOT NULL
      AND sc."personaTags" @> ARRAY[${personaId}]::TEXT[]
      AND scr."reviewStatus" = 'approved'
      AND ss."active" = true
      AND ss."copyrightStatus" = ANY(${ALLOWED_COPYRIGHT_STATUSES}::TEXT[])
    ORDER BY sc."embedding" <=> ${queryVector}::vector
    LIMIT ${limit}
  `;
}

// ── Vector search — global fallback ──────────────────────────────────────────

async function vectorSearchGlobal(
  queryVector: string,
  limit: number,
  mode: ScriptureRetrievalMode,
): Promise<VectorRow[]> {
  if (mode === "voice") {
    return db.$queryRaw<VectorRow[]>`
      SELECT
        sc."id",
        sc."canonicalRef",
        ss."canonicalTitle" AS "sourceTitle",
        ss."priority" AS "sourcePriority",
        sc."translation",
        sc."commentary",
        sc."practicalNote",
        sc."personaTags",
        sc."themeTags",
        1 - (sc."embedding" <=> ${queryVector}::vector) AS "score"
      FROM "ScriptureChunk" sc
      INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
      INNER JOIN "ScriptureChunkReview" scr ON scr."chunkId" = sc."id"
      WHERE
        sc."embedding" IS NOT NULL
        AND scr."reviewStatus" = 'approved'
        AND scr."approvedForVoice" = true
        AND ss."active" = true
        AND ss."copyrightStatus" = ANY(${ALLOWED_COPYRIGHT_STATUSES}::TEXT[])
      ORDER BY sc."embedding" <=> ${queryVector}::vector
      LIMIT ${limit}
    `;
  }

  return db.$queryRaw<VectorRow[]>`
    SELECT
      sc."id",
      sc."canonicalRef",
      ss."canonicalTitle" AS "sourceTitle",
      ss."priority" AS "sourcePriority",
      sc."translation",
      sc."commentary",
      sc."practicalNote",
      sc."personaTags",
      sc."themeTags",
      1 - (sc."embedding" <=> ${queryVector}::vector) AS "score"
    FROM "ScriptureChunk" sc
    INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
    INNER JOIN "ScriptureChunkReview" scr ON scr."chunkId" = sc."id"
    WHERE
      sc."embedding" IS NOT NULL
      AND scr."reviewStatus" = 'approved'
      AND ss."active" = true
      AND ss."copyrightStatus" = ANY(${ALLOWED_COPYRIGHT_STATUSES}::TEXT[])
    ORDER BY sc."embedding" <=> ${queryVector}::vector
    LIMIT ${limit}
  `;
}

// ── Keyword search (full-text via tsvector) ───────────────────────────────────

async function keywordSearch(
  query: string,
  personaId: PersonaId,
  limit: number,
  themes: string[] = [],
  mode: ScriptureRetrievalMode,
): Promise<KeywordRow[]> {
  const keywordQuery = buildScriptureKeywordQuery(query, themes);
  const voiceWhere =
    mode === "voice" ? `AND scr."approvedForVoice" = true` : "";
  const voicePersonaExistsWhere =
    mode === "voice" ? `AND scr2."approvedForVoice" = true` : "";
  const params = [
    keywordQuery.tsQuery,
    keywordQuery.themes,
    keywordQuery.terms,
    personaId,
    limit,
    ALLOWED_COPYRIGHT_STATUSES,
  ];
  const eligibilityWhere = `
        AND scr."reviewStatus" = 'approved'
        ${voiceWhere}
        AND ss."active" = true
        AND ss."copyrightStatus" = ANY($6::TEXT[])
      `;
  const personaExistsEligibilityWhere = `
              AND EXISTS (
                SELECT 1
                FROM "ScriptureChunkReview" scr2
                INNER JOIN "ScriptureSource" ss2 ON ss2."id" = sc2."sourceId"
                WHERE scr2."chunkId" = sc2."id"
                  AND scr2."reviewStatus" = 'approved'
                  ${voicePersonaExistsWhere}
                  AND ss2."active" = true
                  AND ss2."copyrightStatus" = ANY($6::TEXT[])
              )
      `;

  try {
    const rows = await db.$queryRawUnsafe<KeywordRow[]>(
      `
      WITH input AS (
        SELECT
          to_tsquery('english', $1) AS tsq,
          $2::TEXT[] AS themes,
          $3::TEXT[] AS terms
      )
      SELECT
        sc."id",
        sc."canonicalRef",
        ss."canonicalTitle" AS "sourceTitle",
        ss."priority" AS "sourcePriority",
        sc."translation",
        sc."commentary",
        sc."practicalNote",
        sc."personaTags",
        sc."themeTags",
        sc."answerUseCases",
        (
          CASE
            WHEN sc."searchVector" @@ input.tsq
              THEN ts_rank_cd(sc."searchVector", input.tsq) * 2.8
            ELSE 0
          END
          + LEAST(
              0.7,
              0.18 * (
                SELECT COUNT(*)
                FROM unnest(sc."themeTags") AS tag
                WHERE lower(tag) = ANY(input.themes)
              )
            )
          + LEAST(
              0.7,
              0.12 * (
                SELECT COUNT(*)
                FROM unnest(sc."answerUseCases") AS use_case
                CROSS JOIN unnest(input.terms) AS term
                WHERE lower(use_case) LIKE '%' || term || '%'
              )
            )
          + (ss."priority"::DOUBLE PRECISION / 100.0)
        ) AS "keywordRank"
      FROM "ScriptureChunk" sc
      INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
      INNER JOIN "ScriptureChunkReview" scr ON scr."chunkId" = sc."id"
      CROSS JOIN input
      WHERE
        (
          sc."searchVector" @@ input.tsq
          OR EXISTS (
            SELECT 1
            FROM unnest(sc."themeTags") AS tag
            WHERE lower(tag) = ANY(input.themes)
          )
          OR EXISTS (
            SELECT 1
            FROM unnest(sc."answerUseCases") AS use_case
            CROSS JOIN unnest(input.terms) AS term
            WHERE lower(use_case) LIKE '%' || term || '%'
          )
        )
        ${eligibilityWhere}
        AND (
          sc."personaTags" @> ARRAY[$4::TEXT]
          OR NOT EXISTS (
            SELECT 1 FROM "ScriptureChunk" sc2
            CROSS JOIN input
            WHERE sc2."personaTags" @> ARRAY[$4::TEXT]
              ${personaExistsEligibilityWhere}
              AND (
                sc2."searchVector" @@ input.tsq
                OR EXISTS (
                  SELECT 1
                  FROM unnest(sc2."themeTags") AS tag
                  WHERE lower(tag) = ANY(input.themes)
                )
              )
          )
        )
      ORDER BY "keywordRank" DESC
      LIMIT $5
      `,
      ...params,
    );
    return rows;
  } catch {
    // If tsvector index doesn't exist or query fails, return empty
    return [];
  }
}

// ── Merge + rerank ────────────────────────────────────────────────────────────
// Score = vector similarity + keyword rank + authority boost, with optional
// theme nudging. Keyword-only hits stay eligible for embedding outages.

function mergeAndRerank(
  vectorRows: VectorRow[],
  keywordRows: KeywordRow[],
  limit: number,
  themes?: string[],
): ScriptureChunkResult[] {
  const config = getActiveExperimentConfig();
  const safeVectorRows = Array.isArray(vectorRows) ? vectorRows : [];
  const safeKeywordRows = Array.isArray(keywordRows) ? keywordRows : [];
  const keywordMap = new Map<string, number>();
  let maxKeywordRank = 0;

  for (const row of safeKeywordRows) {
    keywordMap.set(row.id, row.keywordRank);
    if (row.keywordRank > maxKeywordRank) maxKeywordRank = row.keywordRank;
  }

  const rowMap = new Map<string, ScriptureRowBase>();
  const vectorMap = new Map<string, VectorRow>();

  for (const row of safeKeywordRows) {
    rowMap.set(row.id, row);
  }

  for (const row of safeVectorRows) {
    rowMap.set(row.id, row);
    vectorMap.set(row.id, row);
  }

  const results: ScriptureChunkResult[] = [];

  for (const [id, row] of rowMap) {
    if (!matchesThemes(row, themes)) continue;

    const vec = vectorMap.get(id);
    const rawKeywordRank = keywordMap.get(id) ?? 0;
    const normalizedKeyword =
      maxKeywordRank > 0 ? rawKeywordRank / maxKeywordRank : 0;
    const vectorScore = vec ? Number(vec.score) : 0;
    const sourcePriority = normalizePriority(row.sourcePriority);
    const themeBoost = hasThemeMatch(row, themes) ? config.themeMatchWeight : 0;

    const combinedScore =
      (config.vectorWeight * vectorScore) +
      (config.keywordWeight * normalizedKeyword) +
      (config.sourcePriorityWeight * sourcePriority) +
      themeBoost;

    results.push({
      id,
      canonicalRef: row.canonicalRef,
      sourceTitle: row.sourceTitle,
      sourcePriority: row.sourcePriority,
      translation: row.translation,
      commentary: row.commentary,
      practicalNote: row.practicalNote,
      personaTags: row.personaTags,
      themeTags: row.themeTags,
      score: combinedScore,
      vectorScore,
      keywordRank: rawKeywordRank,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function normalizePriority(priority: number) {
  const safePriority = Number.isFinite(priority) ? priority : 5;
  return Math.max(1, Math.min(10, safePriority)) / 10;
}

function normalizeTags(tags?: string[]) {
  return (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function hasThemeMatch(row: ScriptureRowBase, themes?: string[]) {
  const requestedThemes = normalizeTags(themes);
  if (requestedThemes.length === 0) return false;

  const rowThemes = new Set(normalizeTags(row.themeTags));
  return requestedThemes.some((theme) => rowThemes.has(theme));
}

function matchesThemes(row: ScriptureRowBase, themes?: string[]) {
  void row;
  void themes;
  return true;
}

// ── Retrieval log (best-effort, no await) ─────────────────────────────────────

async function logRetrieval(input: {
  query: string;
  personaId: string;
  retrievedChunkIds: string[];
  selectedChunkIds: string[];
  latencyMs: number;
  sourceFilter: string[];
  resultCount: number;
}) {
  try {
    await db.retrievalLog.create({
      data: {
        query: redactedQueryPreview(input.query),
        personaId: input.personaId,
        retrievedChunkIds: input.retrievedChunkIds,
        selectedChunkIds: input.selectedChunkIds,
        latencyMs: input.latencyMs,
        sourceFilter: input.sourceFilter,
        resultCount: input.resultCount,
      },
    });
  } catch {
    // Never crash the chat request because of logging
  }
}

function redactedQueryPreview(query: string) {
  return query.replace(/\s+/g, " ").trim().slice(0, 160);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyResult(
  personaId: PersonaId,
  mode: ScriptureRetrievalMode = "text",
): ScriptureRetrievalResult {
  return {
    chunks: [],
    citations: [],
    personaId,
    mode,
    usedFallback: false,
    insufficientContext: true,
    insufficientApprovedContext: mode === "voice",
  };
}

// ── Format for system prompt injection ───────────────────────────────────────

/**
 * Formats retrieved chunks into a numbered context block for the system prompt.
 * Voice-safe: no markdown, numbered for citation.
 */
export function formatScriptureContextForPrompt(
  result: ScriptureRetrievalResult,
): string {
  if (result.chunks.length === 0) {
    return "";
  }

  const lines: string[] = ["Retrieved scripture passages:"];

  for (const [i, chunk] of result.chunks.entries()) {
    const ref = `${chunk.sourceTitle} ${chunk.canonicalRef}`;
    lines.push(`\n[${i + 1}] ${ref}`);
    lines.push(`Translation: ${chunk.translation}`);
    
    const config = getActiveExperimentConfig();
    
    // We truncate based on the token budget heuristically (approx 4 chars per token)
    const tokenBudgetStrLength = config.contextTokenBudget * 4;
    
    if (chunk.commentary) {
      lines.push(`Commentary: ${chunk.commentary}`);
    }
    if (chunk.practicalNote) {
      lines.push(`Application: ${chunk.practicalNote}`);
    }
    
    const currentLength = lines.join("\n").length;
    if (currentLength > tokenBudgetStrLength) {
       // Truncate remainder by stopping loop, saving token budget
       break;
    }
  }

  return lines.join("\n");
}
