CREATE TYPE "VoiceQaEvidenceSource" AS ENUM ('manual', 'automated_fixture');

ALTER TABLE "VoiceQaRun"
ADD COLUMN "evidenceSource" "VoiceQaEvidenceSource" NOT NULL DEFAULT 'manual';

CREATE INDEX "VoiceQaRun_evidenceSource_idx" ON "VoiceQaRun"("evidenceSource");
