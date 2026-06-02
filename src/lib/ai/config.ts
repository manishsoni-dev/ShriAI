import "server-only";

import { env } from "@/env";

export type AIModelConfig = {
  chatModel: string;
  textModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
};

export const aiModelConfig: AIModelConfig = {
  chatModel: env.AI_CHAT_MODEL,
  textModel: env.AI_TEXT_MODEL,
  embeddingModel: env.AI_EMBEDDING_MODEL,
  embeddingDimensions: env.AI_EMBEDDING_DIMENSIONS,
};

export const openAIConfig = {
  apiKey: env.OPENAI_API_KEY,
  models: aiModelConfig,
};
