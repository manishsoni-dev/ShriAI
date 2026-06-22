import "server-only";

import { ollamaConfig } from "@/lib/ai/config";
import { AIError, normalizeAIError } from "@/lib/ai/errors";
import { withAIRetry } from "@/lib/ai/retry";
import type {
  AIMessage,
  AIProvider,
  AIResponseMetadata,
  AIStreamEvent,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";

const PROVIDER_NAME = "ollama";

type FetchLike = typeof fetch;

type OllamaProviderOptions = {
  baseUrl?: string;
  chatModel?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  chatTimeoutMs?: number;
  embeddingTimeoutMs?: number;
  fetchFn?: FetchLike;
};

type OllamaChatResponse = {
  model?: string;
  message?: { content?: string };
  response?: string;
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

type OllamaEmbedResponse = {
  model?: string;
  embeddings?: unknown;
  prompt_eval_count?: number;
};

function toOllamaMessages(messages: AIMessage[]) {
  return messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: message.content,
  }));
}

function usageMetadata(response: OllamaChatResponse) {
  const inputTokens = response.prompt_eval_count;
  const outputTokens = response.eval_count;
  return {
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens === undefined && outputTokens === undefined
        ? undefined
        : (inputTokens ?? 0) + (outputTokens ?? 0),
  };
}

function timedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", onParentAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup() {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

function invalidResponse(message: string, cause?: unknown) {
  return new AIError({
    code: "AI_INVALID_RESPONSE",
    message,
    provider: PROVIDER_NAME,
    cause,
  });
}

function unavailable(message: string, status?: number, cause?: unknown) {
  return new AIError({
    code: "AI_UNAVAILABLE",
    message,
    provider: PROVIDER_NAME,
    retryable: true,
    status,
    cause,
  });
}

function timeoutError(cause?: unknown) {
  return new AIError({
    code: "AI_TIMEOUT",
    message: "The local Ollama request timed out.",
    provider: PROVIDER_NAME,
    retryable: true,
    cause,
  });
}

async function responseError(response: Response) {
  const body = await response.text().catch(() => "");
  const detail = body.slice(0, 300);

  if (response.status === 404) {
    return new AIError({
      code: "AI_BAD_REQUEST",
      message:
        detail ||
        "The configured local model was not found. Pull it with Ollama first.",
      provider: PROVIDER_NAME,
      status: response.status,
    });
  }

  if (response.status >= 500) {
    return unavailable(
      "The local Ollama service failed. Please retry.",
      response.status,
    );
  }

  return new AIError({
    code: "AI_BAD_REQUEST",
    message: detail || `Ollama rejected the request (${response.status}).`,
    provider: PROVIDER_NAME,
    status: response.status,
  });
}

export class LocalOllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimensions: number;
  private readonly chatTimeoutMs: number;
  private readonly embeddingTimeoutMs: number;
  private readonly fetchFn: FetchLike;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? ollamaConfig.baseUrl).replace(/\/$/, "");
    this.chatModel = options.chatModel ?? ollamaConfig.models.chatModel;
    this.embeddingModel =
      options.embeddingModel ?? ollamaConfig.models.embeddingModel;
    this.embeddingDimensions =
      options.embeddingDimensions ?? ollamaConfig.models.embeddingDimensions;
    this.chatTimeoutMs = options.chatTimeoutMs ?? ollamaConfig.chatTimeoutMs;
    this.embeddingTimeoutMs =
      options.embeddingTimeoutMs ?? ollamaConfig.embeddingTimeoutMs;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async *streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
    const model = input.model ?? this.chatModel;
    const timer = timedSignal(input.signal, this.chatTimeoutMs);
    let response: Response;

    try {
      response = await this.fetchFn(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: toOllamaMessages(input.messages),
          stream: true,
          options: { temperature: input.temperature },
        }),
        signal: timer.signal,
      });
    } catch (error) {
      timer.cleanup();
      if (timer.timedOut()) throw timeoutError(error);
      if (input.signal?.aborted) throw error;
      throw unavailable("Local Ollama is not reachable.", undefined, error);
    }

    if (!response.ok) {
      timer.cleanup();
      throw await responseError(response);
    }

    if (!response.body) {
      timer.cleanup();
      throw invalidResponse("Ollama returned an empty streaming response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneMetadata: AIResponseMetadata | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = parseChatEvent(line);
          const text = event.message?.content ?? event.response ?? "";
          if (text) yield { type: "text-delta", text };
          if (event.done) {
            doneMetadata = {
              provider: PROVIDER_NAME,
              model: event.model ?? model,
              usage: usageMetadata(event),
            };
          }
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const event = parseChatEvent(buffer);
        const text = event.message?.content ?? event.response ?? "";
        if (text) yield { type: "text-delta", text };
        if (event.done) {
          doneMetadata = {
            provider: PROVIDER_NAME,
            model: event.model ?? model,
            usage: usageMetadata(event),
          };
        }
      }

      if (!doneMetadata) {
        throw invalidResponse("Ollama stream ended without a done event.");
      }

      yield { type: "done", metadata: doneMetadata };
    } catch (error) {
      if (timer.timedOut()) throw timeoutError(error);
      throw error;
    } finally {
      timer.cleanup();
      reader.releaseLock();
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.chatModel;

    return withAIRetry(
      async () => {
        const response = await this.fetchJson(
          "/api/chat",
          {
            model,
            messages: toOllamaMessages(input.messages),
            stream: false,
            options: { temperature: input.temperature },
          },
          this.chatTimeoutMs,
          input.signal,
        );
        const parsed = response as OllamaChatResponse;
        const text = parsed.message?.content ?? parsed.response;
        if (typeof text !== "string") {
          throw invalidResponse("Ollama chat response did not contain text.");
        }

        return {
          text,
          provider: PROVIDER_NAME,
          model: parsed.model ?? model,
          usage: usageMetadata(parsed),
        };
      },
      { provider: PROVIDER_NAME, attempts: 2 },
    );
  }

  async embedText(input: EmbedTextInput): Promise<EmbedTextResult> {
    const model = input.model ?? this.embeddingModel;

    return withAIRetry(
      async () => {
        const response = (await this.fetchJson(
          "/api/embed",
          {
            model,
            input: input.text,
            truncate: true,
          },
          this.embeddingTimeoutMs,
          input.signal,
        )) as OllamaEmbedResponse;
        const embedding = readEmbedding(
          response.embeddings,
          this.embeddingDimensions,
        );

        return {
          embedding,
          provider: PROVIDER_NAME,
          model: response.model ?? model,
          usage: {
            inputTokens: response.prompt_eval_count,
            totalTokens: response.prompt_eval_count,
          },
        };
      },
      { provider: PROVIDER_NAME, attempts: 2 },
    );
  }

  private async fetchJson(
    path: string,
    body: unknown,
    timeoutMs: number,
    parentSignal?: AbortSignal,
  ) {
    const timer = timedSignal(parentSignal, timeoutMs);
    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: timer.signal,
      });
      if (!response.ok) throw await responseError(response);
      try {
        return await response.json();
      } catch (error) {
        throw invalidResponse("Ollama returned malformed JSON.", error);
      }
    } catch (error) {
      if (timer.timedOut()) throw timeoutError(error);
      if (parentSignal?.aborted) throw error;
      if (error instanceof AIError) throw error;
      throw normalizeAIError(error, PROVIDER_NAME);
    } finally {
      timer.cleanup();
    }
  }
}

function parseChatEvent(line: string): OllamaChatResponse {
  try {
    const parsed = JSON.parse(line) as OllamaChatResponse;
    if (!parsed || typeof parsed !== "object") throw new Error("not object");
    return parsed;
  } catch (error) {
    throw invalidResponse("Ollama returned malformed streaming JSON.", error);
  }
}

function readEmbedding(value: unknown, expectedDimensions: number) {
  if (!Array.isArray(value) || !Array.isArray(value[0])) {
    throw invalidResponse(
      "Ollama embedding response did not contain a vector.",
    );
  }
  const embedding = value[0];
  if (
    embedding.length !== expectedDimensions ||
    embedding.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw invalidResponse(
      `Ollama embedding must contain ${expectedDimensions} finite numbers.`,
    );
  }
  return embedding as number[];
}
