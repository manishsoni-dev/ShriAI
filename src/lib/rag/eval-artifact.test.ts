import { describe, expect, it } from "vitest";

import { validateEvalArtifactIdentity } from "@/lib/rag/eval-artifact";

const now = Date.parse("2026-06-22T12:00:00.000Z");
const config = { id: "baseline-v1", embeddingModel: "local-model" };

function validate(overrides: Record<string, unknown> = {}) {
  return validateEvalArtifactIdentity({
    artifact: {
      passed: true,
      cases: 50,
      createdAt: "2026-06-22T11:00:00.000Z",
      datasetHash: "canonical-hash",
      evalFile: "data/evals/scripture-retrieval/evidence-v1.json",
      experimentConfig: config,
      ...overrides,
    },
    canonicalDatasetHash: "canonical-hash",
    canonicalEvalFile: "data/evals/scripture-retrieval/evidence-v1.json",
    activeExperimentConfig: config,
    nowMs: now,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    minimumCases: 30,
  });
}

describe("validateEvalArtifactIdentity", () => {
  it("accepts a current passing canonical artifact", () => {
    expect(validate()).toEqual([]);
  });

  it("rejects failed, stale, changed-dataset, and undersized evidence", () => {
    expect(
      validate({
        passed: false,
        cases: 12,
        createdAt: "2026-06-01T00:00:00.000Z",
        datasetHash: "old-hash",
      }),
    ).toEqual(
      expect.arrayContaining([
        "artifact not marked passed",
        "dataset fingerprint mismatch",
        "artifact too old or missing createdAt",
        "only 12 cases",
      ]),
    );
  });
});
