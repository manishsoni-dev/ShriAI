import { describe, expect, it, vi } from "vitest";

import { LocalAIProvider } from "@/lib/ai/local-ai-provider";
import type { ChatProvider, EmbeddingProvider } from "@/lib/ai/types";

describe("LocalAIProvider", () => {
  it("delegates chat and embeddings to separate narrow providers", async () => {
    const streamChat = vi.fn<ChatProvider["streamChat"]>(async function* () {
      yield { type: "text-delta", text: "local" };
      yield { type: "done", metadata: { provider: "ollama", model: "chat" } };
    });
    const generateText = vi
      .fn<ChatProvider["generateText"]>()
      .mockResolvedValue({
        text: "local",
        provider: "ollama",
        model: "chat",
      });
    const embedText = vi
      .fn<EmbeddingProvider["embedText"]>()
      .mockResolvedValue({
        embedding: [0.1, 0.2],
        provider: "ollama",
        model: "embed",
      });
    const provider = new LocalAIProvider(
      { streamChat, generateText },
      { embedText },
    );

    await expect(
      provider.generateText({ messages: [{ role: "user", content: "hi" }] }),
    ).resolves.toMatchObject({ model: "chat" });
    await expect(provider.embedText({ text: "dharma" })).resolves.toMatchObject(
      {
        model: "embed",
      },
    );

    expect(generateText).toHaveBeenCalledOnce();
    expect(embedText).toHaveBeenCalledOnce();
  });
});
