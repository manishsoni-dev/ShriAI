import "server-only";

import { db } from "@/lib/db";
import { redactForLogs } from "@/lib/privacy/redaction";

export type ObservabilityEventType = "stt" | "retrieval" | "chat" | "tts";
export type ObservabilityStatus = "success" | "error" | "skipped";

export async function logObservabilityEvent(input: {
  traceId: string;
  eventType: ObservabilityEventType;
  status: ObservabilityStatus;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  personaId?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  payload?: unknown;
}) {
  try {
    await db.observabilityEvent.create({
      data: {
        traceId: input.traceId,
        eventType: input.eventType,
        status: input.status,
        userId: input.userId ?? null,
        conversationId: input.conversationId ?? null,
        messageId: input.messageId ?? null,
        personaId: input.personaId ?? null,
        model: input.model ?? null,
        latencyMs: input.latencyMs ?? null,
        payload:
          input.payload === undefined
            ? undefined
            : JSON.parse(JSON.stringify(redactForLogs(input.payload))),
      },
    });
  } catch {
    // Observability must never break user-facing voice or chat flows.
  }
}
