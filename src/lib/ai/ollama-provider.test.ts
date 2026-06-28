import { describe, expect, it, vi } from "vitest";

import { LocalOllamaProvider } from "@/lib/ai/ollama-provider";

const dimensions = 4;

function provider(fetchFn: typeof fetch, overrides = {}) {
  return new LocalOllamaProvider({
    baseUrl: "http://127.0.0.1:11434",
    chatModel: "qwen3:8b",
    embeddingModel: "qwen3-embedding:0.6b",
    embeddingDimensions: dimensions,
    chatTimeoutMs: 50,
    embeddingTimeoutMs: 50,
    fetchFn,
    ...overrides,
  });
}

describe("LocalOllamaProvider", () => {
  it("constructs and parses a native streaming /api/chat request", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        [
          JSON.stringify({
            model: "qwen3:8b",
            message: { role: "assistant", content: "Steady" },
            done: false,
          }),
          JSON.stringify({
            model: "qwen3:8b",
            message: { role: "assistant", content: " action." },
            done: false,
          }),
          JSON.stringify({
            model: "qwen3:8b",
            message: { role: "assistant", content: "" },
            done: true,
            prompt_eval_count: 7,
            eval_count: 3,
          }),
          "",
        ].join("\n"),
        { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
      ),
    );

    const events = [];
    for await (const event of provider(fetchFn).streamChat({
      messages: [
        { role: "system", content: "Stay grounded." },
        { role: "user", content: "Help me act." },
      ],
      temperature: 0.2,
    })) {
      events.push(event);
    }

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "qwen3:8b",
      messages: [
        { role: "system", content: "Stay grounded." },
        { role: "user", content: "Help me act." },
      ],
      stream: true,
      // think: false disables extended reasoning for qwen3 and similar models
      think: false,
      options: { temperature: 0.2, num_predict: 1024, num_ctx: 8192 },
    });
    expect(events).toEqual([
      { type: "text-delta", text: "Steady" },
      { type: "text-delta", text: " action." },
      {
        type: "done",
        metadata: {
          provider: "ollama",
          model: "qwen3:8b",
          usage: { inputTokens: 7, outputTokens: 3, totalTokens: 10 },
        },
      },
    ]);
  });

  it("constructs a native /api/embed request and validates the vector", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        model: "qwen3-embedding:0.6b",
        embeddings: [[0.1, 0.2, 0.3, 0.4]],
        prompt_eval_count: 5,
      }),
    );

    await expect(
      provider(fetchFn).embedText({ text: "dharma" }),
    ).resolves.toEqual({
      embedding: [0.1, 0.2, 0.3, 0.4],
      provider: "ollama",
      model: "qwen3-embedding:0.6b",
      usage: { inputTokens: 5, totalTokens: 5 },
    });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:11434/api/embed");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "qwen3-embedding:0.6b",
      input: "dharma",
      truncate: true,
    });
  });

  it("rejects malformed and wrong-dimensional embeddings", async () => {
    const malformed = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ embeddings: [[0.1, 0.2]] }));

    await expect(
      provider(malformed).embedText({ text: "dharma" }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE", retryable: false });
    expect(malformed).toHaveBeenCalledOnce();
  });

  it("classifies connection refusal as retryable unavailable service", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      provider(fetchFn).generateText({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE", retryable: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("classifies an elapsed request as a timeout", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            return reject(new DOMException("Aborted", "AbortError"));
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const result = provider(fetchFn, { chatTimeoutMs: 10 }).generateText({
      messages: [{ role: "user", content: "hello" }],
    });

    const rejection = expect(result).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });

    await vi.runAllTimersAsync();
    await rejection;
    vi.useRealTimers();
  });

  it("rejects malformed streaming NDJSON", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not-json\n", { status: 200 }));
    const consume = async () => {
      for await (const event of provider(fetchFn).streamChat({
        messages: [{ role: "user", content: "hello" }],
      })) {
        void event;
      }
    };
    await expect(consume()).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("checkHealth returns quietly if Ollama is available", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response());
    await expect(provider(fetchFn).checkHealth()).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/version",
      expect.any(Object),
    );
  });

  it("checkHealth throws if Ollama is unavailable", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(provider(fetchFn).checkHealth()).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
  });
});
