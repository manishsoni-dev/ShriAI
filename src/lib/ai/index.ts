import { LocalAIProvider } from "@/lib/ai/local-ai-provider";
import { LocalEmbeddingProvider } from "@/lib/ai/local-embedding-provider";
import { LocalOllamaChatProvider } from "@/lib/ai/local-ollama-provider";
import { UsageLoggingProvider } from "@/lib/ai/usage-logging-provider";
import type { AIProvider } from "@/lib/ai/types";

export type {
  AIMessage,
  AIMessageRole,
  AIProvider,
  ChatProvider,
  EmbeddingProvider,
  AIResponseMetadata,
  AIStreamEvent,
  AIUsageMetadata,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";
export {
  AIError,
  getAIUserFacingMessage,
  type AIErrorCode,
} from "@/lib/ai/errors";

export const aiProvider: AIProvider = new UsageLoggingProvider(
  new LocalAIProvider(
    new LocalOllamaChatProvider(),
    new LocalEmbeddingProvider(),
  ),
);
