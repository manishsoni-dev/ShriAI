import "server-only";

import OpenAI from "openai";
import type { ResponseUsage } from "openai/resources/responses/responses";

import { openAIConfig } from "@/lib/ai/config";
import { normalizeAIError } from "@/lib/ai/errors";
import { withAIRetry } from "@/lib/ai/retry";
import type {
  AIMessage,
  AIProvider,
  AIStreamEvent,
  AIUsageMetadata,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";

const PROVIDER_NAME = "openai";

function toInput(messages: AIMessage[]) {
  return messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: message.content,
  }));
}

function toUsageMetadata(
  usage?: ResponseUsage | null,
): AIUsageMetadata | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(client = new OpenAI({ apiKey: openAIConfig.apiKey })) {
    this.client = client;
  }

  async *streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
    const model = input.model ?? openAIConfig.models.chatModel;

    try {
      const stream = await this.client.responses.create({
        model,
        input: toInput(input.messages),
        metadata: input.metadata,
        stream: true,
        temperature: input.temperature,
      });

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          yield {
            type: "text-delta",
            text: event.delta,
          };
        }

        if (event.type === "response.completed") {
          yield {
            type: "done",
            metadata: {
              provider: PROVIDER_NAME,
              model,
              usage: toUsageMetadata(event.response.usage),
              requestId: event.response.id,
            },
          };
        }
      }
    } catch (error) {
      throw normalizeAIError(error, PROVIDER_NAME);
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? openAIConfig.models.textModel;

    return withAIRetry(
      async () => {
        const response = await this.client.responses.create({
          model,
          input: toInput(input.messages),
          metadata: input.metadata,
          temperature: input.temperature,
        });

        return {
          text: response.output_text,
          provider: PROVIDER_NAME,
          model,
          usage: toUsageMetadata(response.usage),
          requestId: response.id,
        };
      },
      {
        provider: PROVIDER_NAME,
      },
    );
  }

  async embedText(input: EmbedTextInput): Promise<EmbedTextResult> {
    const model = input.model ?? openAIConfig.models.embeddingModel;

    return withAIRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model,
          input: input.text,
          dimensions: openAIConfig.models.embeddingDimensions,
        });

        return {
          embedding: response.data[0]?.embedding ?? [],
          provider: PROVIDER_NAME,
          model,
          usage: {
            inputTokens: response.usage?.prompt_tokens,
            totalTokens: response.usage?.total_tokens,
          },
        };
      },
      {
        provider: PROVIDER_NAME,
      },
    );
  }
}
