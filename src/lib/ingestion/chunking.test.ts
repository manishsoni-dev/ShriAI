import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/ingestion/chunking";

describe("chunkText", () => {
  it("creates overlapping chunks", () => {
    const chunks = chunkText("abcdefghijklmnopqrstuvwxyz", {
      chunkSize: 10,
      overlap: 3,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content).toBe("abcdefghij");
    expect(chunks[1]?.content.startsWith("hij")).toBe(true);
  });

  it("throws when overlap is not smaller than chunk size", () => {
    expect(() =>
      chunkText("hello", {
        chunkSize: 5,
        overlap: 5,
      }),
    ).toThrow("overlap");
  });
});
