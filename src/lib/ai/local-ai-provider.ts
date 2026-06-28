import "server-only";

import type {
  AIProvider,
  AIStreamEvent,
  ChatProvider,
  EmbeddingProvider,
  EmbedTextInput,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";

export class LocalAIProvider implements AIProvider {
  constructor(
    private readonly chat: ChatProvider,
    private readonly embeddings: EmbeddingProvider,
  ) {}

  streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
    return this.chat.streamChat(input);
  }

  generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    return this.chat.generateText(input);
  }

  embedText(input: EmbedTextInput): Promise<EmbedTextResult> {
    return this.embeddings.embedText(input);
  }

  async checkHealth(): Promise<void> {
    if (
      "checkHealth" in this.chat &&
      typeof this.chat.checkHealth === "function"
    ) {
      await this.chat.checkHealth();
    } else if (
      "checkHealth" in this.embeddings &&
      typeof this.embeddings.checkHealth === "function"
    ) {
      await this.embeddings.checkHealth();
    }
  }
}
