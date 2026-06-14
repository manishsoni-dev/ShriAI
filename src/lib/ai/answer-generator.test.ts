import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  streamGroundedAnswer,
  validateAnswerCitations,
  GroundedAnswerSchema,
  type StreamEvent,
} from "@/lib/ai/answer-generator";
import { aiProvider } from "@/lib/ai";
import { personas } from "@/lib/personas";

vi.mock("@/lib/ai", () => {
  return {
    aiProvider: {
      streamChat: vi.fn(),
      generateText: vi.fn(),
      embedText: vi.fn(),
    },
    ai: vi.fn().mockImplementation(() => {
      // Mock the implementation of ai() to return our mock aiProvider
      // We must retrieve the aiProvider from the module since it's exported there
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/ai").aiProvider;
    }),
  };
});

const retrievedChunks = [
  {
    id: "chunk-1",
    canonicalRef: "2.47",
    sourceTitle: "Bhagavad Gita",
  },
];

const mockPersona = personas[1]; // Krishna

describe("validateAnswerCitations", () => {
  it("accepts citations that match retrieved chunks", () => {
    expect(
      validateAnswerCitations(
        [{ source: "Bhagavad Gita", canonicalRef: "2.47", chunkId: "chunk-1" }],
        retrievedChunks,
      ),
    ).toBe(true);
  });

  it("rejects invented chunk IDs", () => {
    expect(
      validateAnswerCitations(
        [{ source: "Bhagavad Gita", canonicalRef: "2.47", chunkId: "fake" }],
        retrievedChunks,
      ),
    ).toBe(false);
  });

  it("rejects mismatched references", () => {
    expect(
      validateAnswerCitations(
        [{ source: "Bhagavad Gita", canonicalRef: "3.19", chunkId: "chunk-1" }],
        retrievedChunks,
      ),
    ).toBe(false);
  });

  it("rejects mismatched sources", () => {
    expect(
      validateAnswerCitations(
        [{ source: "Other Source", canonicalRef: "2.47", chunkId: "chunk-1" }],
        retrievedChunks,
      ),
    ).toBe(false);
  });
});

describe("streamGroundedAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams display text and parses the final JSON block", async () => {
    async function* mockStream() {
      yield { type: "text-delta" as const, text: "Do your " };
      yield { type: "text-delta" as const, text: "duty without " };
      yield { type: "text-delta" as const, text: "attachment." };
      yield { type: "text-delta" as const, text: "\n```" };
      yield { type: "text-delta" as const, text: "json\n{" };
      yield {
        type: "text-delta" as const,
        text: '\n  "spokenAnswer": "Do your duty",',
      };
      yield {
        type: "text-delta" as const,
        text: '\n  "citations": [{"source": "Bhagavad Gita", "canonicalRef": "2.47"}],',
      };
      yield {
        type: "text-delta" as const,
        text: '\n  "grounding": {"usedRag": true, "confidence": 0.99}\n}\n',
      };
      yield { type: "text-delta" as const, text: "```" };
    }

    vi.mocked(aiProvider.streamChat).mockReturnValue(mockStream());

    const stream = streamGroundedAnswer({
      query: "What is my duty?",
      persona: mockPersona,
      scriptureContext: "You have a right to perform your prescribed duty...",
      insufficientContext: false,
    });

    const events: StreamEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    const deltas = events
      .filter((e) => e.type === "delta")
      .map((e) => (e.type === "delta" ? e.text : ""));
    const doneEvent = events.find((e) => e.type === "done");

    expect(deltas.join("")).toBe("Do your duty without attachment.\n");
    expect(doneEvent).toBeDefined();
    if (doneEvent?.type === "done") {
      expect(doneEvent.answer.displayAnswer).toBe(
        "Do your duty without attachment.",
      );
      expect(doneEvent.answer.spokenAnswer).toBe("Do your duty");
      expect(doneEvent.answer.citations).toHaveLength(1);
      expect(doneEvent.answer.grounding.usedRag).toBe(true);
    }
  });

  it("handles early abort signal", async () => {
    async function* mockStream() {
      yield { type: "text-delta" as const, text: "Hello" };
      yield { type: "text-delta" as const, text: " World" };
    }

    vi.mocked(aiProvider.streamChat).mockReturnValue(mockStream());

    const controller = new AbortController();
    controller.abort(); // Abort immediately

    const stream = streamGroundedAnswer({
      query: "Hello?",
      persona: mockPersona,
      scriptureContext: "",
      insufficientContext: false,
      signal: controller.signal,
    });

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _event of stream) {
        // should throw
      }
    }).rejects.toThrow("AbortError");
  });

  it("throws if no JSON block is provided by the model", async () => {
    async function* mockStream() {
      yield { type: "text-delta" as const, text: "I forgot the JSON." };
    }

    vi.mocked(aiProvider.streamChat).mockReturnValue(mockStream());

    const stream = streamGroundedAnswer({
      query: "Test",
      persona: mockPersona,
      scriptureContext: "",
      insufficientContext: false,
    });

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _event of stream) {
        // iter
      }
    }).rejects.toThrow(
      "Assistant response did not contain the required JSON metadata block.",
    );
  });

  it("validates that Zod schema correctly parses a valid object", () => {
    const valid = {
      spokenAnswer: "test",
      citations: [{ source: "A", canonicalRef: "1.1" }],
      grounding: { usedRag: false, confidence: 0.5 },
    };
    expect(() => GroundedAnswerSchema.parse(valid)).not.toThrow();
  });

  it("validates that Zod schema rejects invalid data", () => {
    const invalid = {
      spokenAnswer: "", // empty not allowed
      citations: "none", // must be array
      grounding: { usedRag: "no", confidence: 2 }, // invalid types/ranges
    };
    expect(() => GroundedAnswerSchema.parse(invalid)).toThrow();
  });
});
