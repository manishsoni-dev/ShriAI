import { describe, expect, it } from "vitest";

import { validateAnswerCitations } from "@/lib/ai/answer-generator";

const retrievedChunks = [
  {
    id: "chunk-1",
    canonicalRef: "2.47",
    sourceTitle: "Bhagavad Gita",
  },
];

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
