-- Add flexible trace events for STT, retrieval, chat, and TTS diagnostics.

CREATE TABLE "ObservabilityEvent" (
  "id"             TEXT NOT NULL,
  "traceId"        TEXT NOT NULL,
  "eventType"      TEXT NOT NULL,
  "status"         TEXT NOT NULL,
  "userId"         TEXT,
  "conversationId" TEXT,
  "messageId"      TEXT,
  "personaId"      TEXT,
  "model"          TEXT,
  "latencyMs"      INTEGER,
  "payload"        JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ObservabilityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObservabilityEvent_traceId_idx" ON "ObservabilityEvent"("traceId");
CREATE INDEX "ObservabilityEvent_eventType_idx" ON "ObservabilityEvent"("eventType");
CREATE INDEX "ObservabilityEvent_status_idx" ON "ObservabilityEvent"("status");
CREATE INDEX "ObservabilityEvent_createdAt_idx" ON "ObservabilityEvent"("createdAt");
CREATE INDEX "ObservabilityEvent_userId_idx" ON "ObservabilityEvent"("userId");
CREATE INDEX "ObservabilityEvent_conversationId_idx" ON "ObservabilityEvent"("conversationId");
