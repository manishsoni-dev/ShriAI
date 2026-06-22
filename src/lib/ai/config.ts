import "server-only";

import { env } from "@/env";

export type AIModelConfig = {
  chatModel: string;
  textModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
};

export const aiModelConfig: AIModelConfig = {
  chatModel: env.SHRI_AI_CHAT_MODEL,
  textModel: env.SHRI_AI_CHAT_MODEL,
  embeddingModel: env.SHRI_AI_EMBEDDING_MODEL,
  embeddingDimensions: env.SHRI_AI_EMBEDDING_DIMENSIONS,
};

export const ollamaConfig = {
  baseUrl: env.OLLAMA_BASE_URL.replace(/\/$/, ""),
  chatTimeoutMs: env.SHRI_AI_CHAT_TIMEOUT_MS,
  embeddingTimeoutMs: env.SHRI_AI_EMBEDDING_TIMEOUT_MS,
  models: aiModelConfig,
};
