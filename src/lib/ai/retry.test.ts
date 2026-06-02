import { describe, expect, it, vi } from "vitest";

import { AIError } from "@/lib/ai/errors";
import { withAIRetry } from "@/lib/ai/retry";

describe("withAIRetry", () => {
  it("retries transient AI errors", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new AIError({
          code: "AI_TRANSIENT_ERROR",
          message: "Temporary failure",
          provider: "test",
          retryable: true,
          status: 500,
        }),
      )
      .mockResolvedValue("ok");

    await expect(
      withAIRetry(operation, {
        attempts: 2,
        baseDelayMs: 1,
        provider: "test",
      }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable AI errors", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(
      new AIError({
        code: "AI_BAD_REQUEST",
        message: "Bad request",
        provider: "test",
        status: 400,
      }),
    );

    await expect(
      withAIRetry(operation, {
        attempts: 3,
        baseDelayMs: 1,
        provider: "test",
      }),
    ).rejects.toMatchObject({
      code: "AI_BAD_REQUEST",
      retryable: false,
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
