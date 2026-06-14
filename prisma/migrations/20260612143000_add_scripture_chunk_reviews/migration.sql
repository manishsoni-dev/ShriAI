-- Add human theological/source review records for scripture chunks.

CREATE TYPE "ScriptureReviewStatus" AS ENUM (
  'pending',
  'in_review',
  'approved',
  'rejected',
  'needs_revision'
);

CREATE TABLE "ScriptureChunkReview" (
  "id"                  TEXT NOT NULL,
  "chunkId"             TEXT NOT NULL,
  "reviewStatus"        "ScriptureReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewedBy"          TEXT,
  "reviewedAt"          TIMESTAMP(3),
  "accuracyScore"       INTEGER,
  "interpretationNotes" TEXT,
  "approvedForVoice"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptureChunkReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScriptureChunkReview_chunkId_fkey"
    FOREIGN KEY ("chunkId") REFERENCES "ScriptureChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScriptureChunkReview_accuracyScore_check"
    CHECK ("accuracyScore" IS NULL OR ("accuracyScore" >= 1 AND "accuracyScore" <= 5))
);

CREATE UNIQUE INDEX "ScriptureChunkReview_chunkId_key"
  ON "ScriptureChunkReview"("chunkId");

CREATE INDEX "ScriptureChunkReview_reviewStatus_idx"
  ON "ScriptureChunkReview"("reviewStatus");

CREATE INDEX "ScriptureChunkReview_approvedForVoice_idx"
  ON "ScriptureChunkReview"("approvedForVoice");

CREATE INDEX "ScriptureChunkReview_reviewedAt_idx"
  ON "ScriptureChunkReview"("reviewedAt");
