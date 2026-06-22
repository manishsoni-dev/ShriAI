import "server-only";

import { LocalOllamaProvider } from "@/lib/ai/ollama-provider";
import type {
  AIStreamEvent,
  ChatProvider,
  GenerateTextInput,
  GenerateTextResult,
  StreamChatInput,
} from "@/lib/ai/types";

/** Narrow chat-only surface for the local Ollama runtime. */
export class LocalOllamaChatProvider implements ChatProvider {
  constructor(private readonly transport = new LocalOllamaProvider()) {}

  streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
    return this.transport.streamChat(input);
  }

  generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    return this.transport.generateText(input);
  }
}
