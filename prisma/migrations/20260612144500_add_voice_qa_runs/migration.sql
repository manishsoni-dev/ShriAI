-- Store manual voice-first QA runs and measured STT/TTS/playback steps.

CREATE TYPE "VoiceQaRunStatus" AS ENUM (
  'pending',
  'passed',
  'failed',
  'partial'
);

CREATE TYPE "VoiceQaStepStatus" AS ENUM (
  'pending',
  'passed',
  'failed',
  'skipped'
);

CREATE TABLE "VoiceQaRun" (
  "id"          TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "device"      TEXT,
  "browser"     TEXT,
  "personaId"   TEXT,
  "status"      "VoiceQaRunStatus" NOT NULL DEFAULT 'pending',
  "notes"       TEXT,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VoiceQaRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceQaStep" (
  "id"                 TEXT NOT NULL,
  "runId"              TEXT NOT NULL,
  "stepType"           TEXT NOT NULL,
  "status"             "VoiceQaStepStatus" NOT NULL DEFAULT 'pending',
  "transcript"         TEXT,
  "expectedTranscript" TEXT,
  "wer"                DOUBLE PRECISION,
  "latencyMs"          INTEGER,
  "firstAudibleMs"     INTEGER,
  "errorCode"          TEXT,
  "notes"              TEXT,
  "payload"            JSONB,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VoiceQaStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VoiceQaStep_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "VoiceQaRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VoiceQaStep_wer_check"
    CHECK ("wer" IS NULL OR ("wer" >= 0 AND "wer" <= 1)),
  CONSTRAINT "VoiceQaStep_latencyMs_check"
    CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0),
  CONSTRAINT "VoiceQaStep_firstAudibleMs_check"
    CHECK ("firstAudibleMs" IS NULL OR "firstAudibleMs" >= 0)
);

CREATE INDEX "VoiceQaRun_status_idx" ON "VoiceQaRun"("status");
CREATE INDEX "VoiceQaRun_personaId_idx" ON "VoiceQaRun"("personaId");
CREATE INDEX "VoiceQaRun_startedAt_idx" ON "VoiceQaRun"("startedAt");

CREATE INDEX "VoiceQaStep_runId_idx" ON "VoiceQaStep"("runId");
CREATE INDEX "VoiceQaStep_stepType_idx" ON "VoiceQaStep"("stepType");
CREATE INDEX "VoiceQaStep_status_idx" ON "VoiceQaStep"("status");
