export type EvalArtifactIdentityInput = {
  artifact: {
    passed?: boolean;
    cases?: number;
    createdAt?: string;
    datasetHash?: string;
    evalFile?: string;
    experimentConfig?: unknown;
  };
  canonicalDatasetHash: string | null;
  canonicalEvalFile: string;
  activeExperimentConfig: unknown;
  nowMs?: number;
  maxAgeMs: number;
  minimumCases: number;
};

export function validateEvalArtifactIdentity(input: EvalArtifactIdentityInput) {
  const { artifact } = input;
  const createdAt = Date.parse(artifact.createdAt ?? "");
  const nowMs = input.nowMs ?? Date.now();

  return [
    artifact.passed !== true ? "artifact not marked passed" : null,
    artifact.evalFile !== input.canonicalEvalFile
      ? `wrong dataset path (${artifact.evalFile ?? "missing"})`
      : null,
    !input.canonicalDatasetHash ||
    artifact.datasetHash !== input.canonicalDatasetHash
      ? "dataset fingerprint mismatch"
      : null,
    JSON.stringify(artifact.experimentConfig) !==
    JSON.stringify(input.activeExperimentConfig)
      ? "experiment config mismatch"
      : null,
    !Number.isFinite(createdAt) || nowMs - createdAt > input.maxAgeMs
      ? "artifact too old or missing createdAt"
      : null,
    (artifact.cases ?? 0) < input.minimumCases
      ? `only ${artifact.cases ?? 0} cases`
      : null,
  ].filter((reason): reason is string => reason !== null);
}
