import "server-only";

import { db } from "@/lib/db";
import { logStructured } from "@/lib/logger";
import { sanitizePrivacyMetadata } from "@/lib/privacy/redaction";

export type ProductEventType =
  | "landing_page_viewed"
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "starter_prompt_selected"
  | "first_question_submitted"
  | "grounded_answer_rendered"
  | "citations_opened"
  | "abstention_rendered"
  | "answer_saved"
  | "reflection_created"
  | "follow_up_submitted"
  | "feedback_submitted"
  | "voice_recording_started"
  | "voice_transcription_completed"
  | "workflow_error";

type ProductEventPayload = {
  userId?: string | null;
  workspaceId?: string | null;
  personaId?: string | null;
  traceId?: string | null;
  /** Safe structured metadata only — no raw question/answer text */
  metadata?: Record<string, unknown>;
};

/**
 * Log a privacy-safe internal product analytics event.
 *
 * IMPORTANT: Raw prompt text, answer content, audio buffers, or any private
 * user-generated content MUST NOT be included in `metadata`. Only safe
 * structural identifiers (counts, booleans, personaId, etc.) are permitted.
 */
export async function logProductEvent(
  eventType: ProductEventType,
  payload: ProductEventPayload = {},
): Promise<void> {
  try {
    // Only verify consent if this is an authenticated event attached to a user
    if (payload.userId) {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          researchConsentGivenAt: true,
          researchConsentWithdrawnAt: true,
        },
      });

      // Do not log if user hasn't consented or has withdrawn consent
      if (!user?.researchConsentGivenAt || user.researchConsentWithdrawnAt) {
        return;
      }
    }

    await db.productEvent.create({
      data: {
        eventType,
        userId: payload.userId ?? null,
        workspaceId: payload.workspaceId ?? null,
        personaId: payload.personaId ?? null,
        traceId: payload.traceId ?? null,
        metadata:
          payload.metadata === undefined
            ? undefined
            : JSON.parse(
                JSON.stringify(sanitizePrivacyMetadata(payload.metadata)),
              ),
      },
    });
  } catch {
    // Analytics must never break core product flows.
    logStructured("warn", "ProductEvent write failed", { eventType });
  }
}
