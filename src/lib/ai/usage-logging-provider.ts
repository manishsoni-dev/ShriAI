import "server-only";

import { AIError, normalizeAIError } from "@/lib/ai/errors";
import type {
  AIProvider,
  AIResponseMetadata,
  AIStreamEvent,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";
import { recordUsageEvent } from "@/lib/usage";

const FALLBACK_PROVIDER = "unknown";
const FALLBACK_MODEL = "unknown";

function getLatencyMs(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

async function recordSuccess(input: {
  context: GenerateTextInput["usageContext"];
  metadata: AIResponseMetadata;
  latencyMs: number;
}) {
  if (!input.context) {
    return;
  }

  await recordUsageEvent({
    userId: input.context.userId,
    workspaceId: input.context.workspaceId,
    conversationId: input.context.conversationId,
    provider: input.metadata.provider,
    model: input.metadata.model,
    inputTokens: input.metadata.usage?.inputTokens,
    outputTokens: input.metadata.usage?.outputTokens,
    totalTokens: input.metadata.usage?.totalTokens,
    latencyMs: input.latencyMs,
    status: "success",
  });
}

async function recordFailure(input: {
  context: GenerateTextInput["usageContext"];
  error: unknown;
  latencyMs: number;
  provider?: string;
  model?: string;
}) {
  if (!input.context) {
    return;
  }

  const aiError =
    input.error instanceof AIError
      ? input.error
      : normalizeAIError(input.error, input.provider ?? FALLBACK_PROVIDER);

  await recordUsageEvent({
    userId: input.context.userId,
    workspaceId: input.context.workspaceId,
    conversationId: input.context.conversationId,
    provider: input.provider ?? aiError.provider,
    model: input.model ?? FALLBACK_MODEL,
    latencyMs: input.latencyMs,
    status: "error",
    errorCode: aiError.code,
  });
}

export class UsageLoggingProvider implements AIProvider {
  constructor(private readonly provider: AIProvider) {}

  async *streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
    const startedAt = performance.now();
    let finalMetadata: AIResponseMetadata | undefined;

    try {
      for await (const event of this.provider.streamChat(input)) {
        if (event.type === "done") {
          finalMetadata = event.metadata;
        }

        yield event;
      }

      await recordSuccess({
        context: input.usageContext,
        metadata: finalMetadata ?? {
          provider: FALLBACK_PROVIDER,
          model: input.model ?? FALLBACK_MODEL,
        },
        latencyMs: getLatencyMs(startedAt),
      });
    } catch (error) {
      await recordFailure({
        context: input.usageContext,
        error,
        latencyMs: getLatencyMs(startedAt),
        model: input.model,
      });

      throw error;
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const startedAt = performance.now();

    try {
      const response = await this.provider.generateText(input);

      await recordSuccess({
        context: input.usageContext,
        metadata: response,
        latencyMs: getLatencyMs(startedAt),
      });

      return response;
    } catch (error) {
      await recordFailure({
        context: input.usageContext,
        error,
        latencyMs: getLatencyMs(startedAt),
        model: input.model,
      });

      throw error;
    }
  }

  async embedText(input: EmbedTextInput): Promise<EmbedTextResult> {
    const startedAt = performance.now();

    try {
      const response = await this.provider.embedText(input);

      await recordSuccess({
        context: input.usageContext,
        metadata: response,
        latencyMs: getLatencyMs(startedAt),
      });

      return response;
    } catch (error) {
      await recordFailure({
        context: input.usageContext,
        error,
        latencyMs: getLatencyMs(startedAt),
        model: input.model,
      });

      throw error;
    }
  }

  async checkHealth(): Promise<void> {
    if (this.provider.checkHealth) {
      await this.provider.checkHealth();
    }
  }
}
