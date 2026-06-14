export type RetrievalExperimentConfig = {
  id: string;
  description: string;
  embeddingModel: string;
  vectorCandidateCount: number;
  keywordCandidateCount: number;
  finalTopK: number;
  minimumVectorScore: number;
  minimumCombinedScore: number;
  vectorWeight: number;
  keywordWeight: number;
  sourcePriorityWeight: number;
  themeMatchWeight: number;
  personaMatchWeight: number;
  useCaseMatchWeight: number;
  reranker: "none" | "heuristic" | "model";
  contextTokenBudget: number;
  deduplicateContext: boolean;
  retrievalMode: "text" | "voice";
};

export const BASELINE_CONFIG: RetrievalExperimentConfig = {
  id: "baseline-v1",
  description: "Canonical production baseline",
  embeddingModel: "text-embedding-3-small",
  vectorCandidateCount: 20,
  keywordCandidateCount: 20,
  finalTopK: 5,
  minimumVectorScore: 0.70,
  minimumCombinedScore: 0.50,
  vectorWeight: 1.0,
  keywordWeight: 1.0,
  sourcePriorityWeight: 0.1,
  themeMatchWeight: 0.18,
  personaMatchWeight: 0.0,
  useCaseMatchWeight: 0.12,
  reranker: "heuristic",
  contextTokenBudget: 4000,
  deduplicateContext: true,
  retrievalMode: "text",
};

// Global active config, can be overridden by experiments
let activeConfig = BASELINE_CONFIG;

export function getActiveExperimentConfig(): RetrievalExperimentConfig {
  return activeConfig;
}

export function setActiveExperimentConfig(config: RetrievalExperimentConfig) {
  activeConfig = config;
}
