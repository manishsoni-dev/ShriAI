import { describe, expectTypeOf, it } from "vitest";

import type { AIProvider } from "@/lib/ai/types";

describe("AIProvider interface", () => {
  it("requires chat, text, and embedding capabilities", () => {
    const provider = {
      async *streamChat() {
        yield {
          type: "text-delta",
          text: "hello",
        } as const;
      },
      async generateText() {
        return {
          text: "hello",
          provider: "test",
          model: "test-model",
        };
      },
      async embedText() {
        return {
          embedding: [0.1, 0.2],
          provider: "test",
          model: "test-embedding",
        };
      },
    } satisfies AIProvider;

    expectTypeOf(provider).toMatchTypeOf<AIProvider>();
  });
});
