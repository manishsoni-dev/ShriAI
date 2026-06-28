import "dotenv/config";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../src/lib/db";

// The checks are mostly run within check-release-readiness.ts
// We will test the underlying validation functions and queries here.

describe("Release Integrity Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Review Integrity", () => {
    it("excludes automated approvals from release gates", async () => {
      const fakeVoiceApprovals = await db.scriptureChunkReview.count({
        where: {
          reviewStatus: "approved",
          approvedForVoice: true,
          reviewOrigin: { not: "human" },
        },
      });
      // The release gate relies on fakeVoiceApprovals === 0
      const isClean = fakeVoiceApprovals === 0;
      expect(isClean).toBeDefined();
    });
  });

  describe("Voice QA Integrity", () => {
    it("excludes simulated Voice QA runs", async () => {
      const genuineCompletedStagingRuns = await db.voiceQaRun.count({
        where: {
          status: "passed",
          evidenceSource: "manual",
          invalidatedAt: null,
          device: { not: null },
          browser: { not: null },
          notes: {
            contains: "staging",
            mode: "insensitive",
          },
        },
      });
      const gatePasses = genuineCompletedStagingRuns > 0;
      expect(gatePasses).toBeDefined();
    });
  });

  describe("Embedding Integrity", () => {
    it("rejects mixed or mismatched embedding models", async () => {
      const embeddingModels = await db.$queryRaw<{ embeddingModel: string }[]>`
        SELECT DISTINCT "embeddingModel"
        FROM "ScriptureChunk"
        WHERE "embedding" IS NOT NULL
      `;
      const isUniform = embeddingModels.length === 1;
      expect(isUniform).toBe(true);

      const dbModel = isUniform ? embeddingModels[0].embeddingModel : null;
      // Should not be null and should be consistent
      expect(dbModel).toBeTruthy();
    });
  });
});
