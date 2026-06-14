import { describe, expect, it } from "vitest";

import {
  buildReviewDecision,
  type ReviewMutationInput,
  ReviewValidationError,
} from "@/lib/scripture-review/policy";

const baseInput = {
  reviewId: "review-1",
  updatedAt: "2026-06-12T10:00:00.000Z",
} satisfies Pick<ReviewMutationInput, "reviewId" | "updatedAt">;

describe("buildReviewDecision", () => {
  it("approves text without approving voice", () => {
    const decision = buildReviewDecision({
      ...baseInput,
      action: "approve_text",
    });

    expect(decision.reviewStatus).toBe("approved");
    expect(decision.approvedForVoice).toBe(false);
  });

  it("approves voice with required reviewer fields", () => {
    const decision = buildReviewDecision({
      ...baseInput,
      action: "approve_voice",
      accuracyScore: 5,
      interpretationNotes: "Translation and commentary are accurate.",
    });

    expect(decision.reviewStatus).toBe("approved");
    expect(decision.approvedForVoice).toBe(true);
    expect(decision.accuracyScore).toBe(5);
  });

  it("rejects voice approval without score and notes", () => {
    expect(() =>
      buildReviewDecision({
        ...baseInput,
        action: "approve_voice",
      }),
    ).toThrow(ReviewValidationError);
  });

  it("requires a rejection reason", () => {
    expect(() =>
      buildReviewDecision({
        ...baseInput,
        action: "reject",
      }),
    ).toThrow("Rejection requires a reason.");
  });

  it("requires actionable notes for needs_changes", () => {
    expect(() =>
      buildReviewDecision({
        ...baseInput,
        action: "needs_changes",
      }),
    ).toThrow("Requesting changes requires actionable notes.");
  });
});
