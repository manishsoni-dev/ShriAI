import { z } from "zod";

export const reviewStatusSchema = z.enum([
  "pending",
  "in_review",
  "approved",
  "rejected",
  "needs_changes",
]);

export const reviewActionSchema = z.enum([
  "approve_text",
  "approve_voice",
  "reject",
  "needs_changes",
]);

export const reviewMutationSchema = z.object({
  reviewId: z.string().min(1),
  updatedAt: z.string().datetime(),
  action: reviewActionSchema,
  accuracyScore: z.coerce.number().int().min(1).max(5).optional(),
  interpretationNotes: z.string().trim().max(5000).optional(),
  rejectionReason: z.string().trim().max(5000).optional(),
});

export type ReviewAction = z.infer<typeof reviewActionSchema>;
export type ReviewMutationInput = z.infer<typeof reviewMutationSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export type ReviewDecision = {
  reviewStatus: ReviewStatus;
  approvedForVoice: boolean;
  accuracyScore: number | null;
  interpretationNotes: string | null;
  rejectionReason: string | null;
  auditNotes: string;
};

export type ReviewValidationErrorCode =
  | "malformed_input"
  | "invalid_transition"
  | "missing_rejection_reason"
  | "missing_needs_changes_notes"
  | "missing_voice_approval_fields";

export class ReviewValidationError extends Error {
  constructor(
    public readonly code: ReviewValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReviewValidationError";
  }
}

function normalizedOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildReviewDecision(
  input: ReviewMutationInput,
): ReviewDecision {
  const interpretationNotes = normalizedOptionalText(input.interpretationNotes);
  const rejectionReason = normalizedOptionalText(input.rejectionReason);
  const accuracyScore = input.accuracyScore ?? null;

  if (input.action === "approve_text") {
    return {
      reviewStatus: "approved",
      approvedForVoice: false,
      accuracyScore,
      interpretationNotes,
      rejectionReason: null,
      auditNotes: interpretationNotes ?? "Approved for text use only.",
    };
  }

  if (input.action === "approve_voice") {
    if (accuracyScore === null || !interpretationNotes) {
      throw new ReviewValidationError(
        "missing_voice_approval_fields",
        "Voice approval requires an accuracy score and reviewer notes.",
      );
    }

    return {
      reviewStatus: "approved",
      approvedForVoice: true,
      accuracyScore,
      interpretationNotes,
      rejectionReason: null,
      auditNotes: interpretationNotes,
    };
  }

  if (input.action === "reject") {
    if (!rejectionReason) {
      throw new ReviewValidationError(
        "missing_rejection_reason",
        "Rejection requires a reason.",
      );
    }

    return {
      reviewStatus: "rejected",
      approvedForVoice: false,
      accuracyScore,
      interpretationNotes,
      rejectionReason,
      auditNotes: rejectionReason,
    };
  }

  if (input.action === "needs_changes") {
    if (!interpretationNotes) {
      throw new ReviewValidationError(
        "missing_needs_changes_notes",
        "Requesting changes requires actionable notes.",
      );
    }

    return {
      reviewStatus: "needs_changes",
      approvedForVoice: false,
      accuracyScore,
      interpretationNotes,
      rejectionReason: null,
      auditNotes: interpretationNotes,
    };
  }

  throw new ReviewValidationError(
    "invalid_transition",
    "Unsupported review action.",
  );
}
