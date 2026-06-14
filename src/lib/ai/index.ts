import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { UsageLoggingProvider } from "@/lib/ai/usage-logging-provider";
import type { AIProvider } from "@/lib/ai/types";

export type {
  AIMessage,
  AIMessageRole,
  AIProvider,
  AIResponseMetadata,
  AIStreamEvent,
  AIUsageMetadata,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";
export { AIError, type AIErrorCode } from "@/lib/ai/errors";

export const aiProvider: AIProvider = new UsageLoggingProvider(
  new OpenAIProvider(),
);
