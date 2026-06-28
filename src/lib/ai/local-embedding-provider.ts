import "server-only";

import { LocalOllamaProvider } from "@/lib/ai/ollama-provider";
import type {
  EmbeddingProvider,
  EmbedTextInput,
  EmbedTextResult,
} from "@/lib/ai/types";

/** Narrow embedding-only surface for the configured local Ollama model. */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly transport = new LocalOllamaProvider()) {}

  embedText(input: EmbedTextInput): Promise<EmbedTextResult> {
    return this.transport.embedText(input);
  }

  checkHealth(): Promise<void> {
    return this.transport.checkHealth();
  }
}
