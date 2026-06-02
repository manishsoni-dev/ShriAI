import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIError } from "@/lib/ai/errors";
import { UsageLoggingProvider } from "@/lib/ai/usage-logging-provider";
import type { AIProvider } from "@/lib/ai/types";
import { recordUsageEvent } from "@/lib/usage";

vi.mock("@/lib/usage", () => ({
  recordUsageEvent: vi.fn(),
}));

const usageContext = {
  userId: "user_1",
  workspaceId: "workspace_1",
  conversationId: "conversation_1",
};

describe("UsageLoggingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records successful text generation usage", async () => {
    const provider = new UsageLoggingProvider({
      async *streamChat() {},
      async generateText() {
        return {
          text: "hello",
          provider: "test",
          model: "test-model",
          usage: {
            inputTokens: 4,
            outputTokens: 6,
            totalTokens: 10,
          },
        };
      },
      async embedText() {
        throw new Error("not used");
      },
    } satisfies AIProvider);

    await provider.generateText({
      messages: [{ role: "user", content: "hi" }],
      usageContext,
    });

    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        workspaceId: "workspace_1",
        conversationId: "conversation_1",
        provider: "test",
        model: "test-model",
        inputTokens: 4,
        outputTokens: 6,
        totalTokens: 10,
        status: "success",
      }),
    );
  });

  it("records failed generation usage", async () => {
    const provider = new UsageLoggingProvider({
      async *streamChat() {},
      async generateText() {
        throw new AIError({
          code: "AI_RATE_LIMITED",
          message: "Rate limited",
          provider: "test",
          retryable: true,
          status: 429,
        });
      },
      async embedText() {
        throw new Error("not used");
      },
    } satisfies AIProvider);

    await expect(
      provider.generateText({
        messages: [{ role: "user", content: "hi" }],
        model: "test-model",
        usageContext,
      }),
    ).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
    });

    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        workspaceId: "workspace_1",
        conversationId: "conversation_1",
        provider: "test",
        model: "test-model",
        status: "error",
        errorCode: "AI_RATE_LIMITED",
      }),
    );
  });
});
