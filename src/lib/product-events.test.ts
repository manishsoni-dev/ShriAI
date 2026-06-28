import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        researchConsentGivenAt: new Date("2026-06-28T00:00:00.000Z"),
        researchConsentWithdrawnAt: null,
      }),
    },
    productEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logStructured: vi.fn(),
}));

import { db } from "@/lib/db";
import { logProductEvent } from "@/lib/product-events";

describe("product-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports logProductEvent function", () => {
    expect(typeof logProductEvent).toBe("function");
  });

  it("accepts all valid event types without type errors", () => {
    const types = [
      "landing_page_viewed",
      "signup_completed",
      "onboarding_started",
      "onboarding_completed",
      "starter_prompt_selected",
      "first_question_submitted",
      "grounded_answer_rendered",
      "citations_opened",
      "abstention_rendered",
      "answer_saved",
      "reflection_created",
      "follow_up_submitted",
      "feedback_submitted",
      "voice_recording_started",
      "voice_transcription_completed",
      "workflow_error",
    ] as const;

    expect(types).toHaveLength(16);
  });

  it("does not persist raw content-like metadata strings", async () => {
    await logProductEvent("workflow_error", {
      userId: "user-1",
      metadata: {
        promptText: "private prompt sentinel",
        answerPreview: "private answer sentinel",
        transcriptText: "private transcript sentinel",
        documentExcerpt: "private document sentinel",
        contentLength: 24,
      },
    });

    expect(db.productEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: {
          promptText: { length: 23 },
          answerPreview: { length: 23 },
          transcriptText: { length: 27 },
          documentExcerpt: { length: 25 },
          contentLength: 24,
        },
      }),
    });
  });

  it("redacts email, cookie, token, and API-key sentinel strings", async () => {
    await logProductEvent("workflow_error", {
      userId: "user-1",
      metadata: {
        cookie: "session=token_sentinel_private",
        diagnostic:
          "contact seeker@example.com with api_key_sentinel_private123",
        tokenValue: "token_sentinel_private",
      },
    });

    const createCall = vi.mocked(db.productEvent.create).mock.calls[0]!;
    const metadata = createCall[0].data.metadata;

    expect(JSON.stringify(metadata)).not.toContain("seeker@example.com");
    expect(JSON.stringify(metadata)).not.toContain("sentinel_private");
    expect(metadata).toMatchObject({
      cookie: "[redacted]",
      diagnostic: "contact [redacted-email] with [redacted-key]",
      tokenValue: "[redacted]",
    });
  });
});
