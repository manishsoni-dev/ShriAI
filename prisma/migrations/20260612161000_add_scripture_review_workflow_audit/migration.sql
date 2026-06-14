-- Add review workflow fields, immutable audit history, and source eligibility.

UPDATE "ScriptureChunkReview"
SET "reviewStatus" = 'needs_changes'
WHERE "reviewStatus"::TEXT = 'needs_revision';

ALTER TABLE "ScriptureSource"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "ScriptureSource_active_idx"
  ON "ScriptureSource"("active");

ALTER TABLE "ScriptureChunkReview"
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE "ScriptureChunkReview"
  ADD CONSTRAINT "ScriptureChunkReview_voice_requires_approved_check"
  CHECK ("approvedForVoice" = false OR "reviewStatus" = 'approved');

ALTER TABLE "ScriptureChunkReview"
  ADD CONSTRAINT "ScriptureChunkReview_rejected_requires_reason_check"
  CHECK (
    "reviewStatus" <> 'rejected'
    OR "rejectionReason" IS NOT NULL
    OR "interpretationNotes" IS NOT NULL
  );

CREATE TABLE "ScriptureChunkReviewAudit" (
  "id"                       TEXT NOT NULL,
  "reviewId"                 TEXT NOT NULL,
  "scriptureChunkId"         TEXT NOT NULL,
  "previousStatus"           "ScriptureReviewStatus",
  "nextStatus"               "ScriptureReviewStatus" NOT NULL,
  "previousApprovedForVoice" BOOLEAN,
  "nextApprovedForVoice"     BOOLEAN NOT NULL,
  "reviewerUserId"           TEXT NOT NULL,
  "notes"                    TEXT,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScriptureChunkReviewAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScriptureChunkReviewAudit_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "ScriptureChunkReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScriptureChunkReviewAudit_scriptureChunkId_fkey"
    FOREIGN KEY ("scriptureChunkId") REFERENCES "ScriptureChunk"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ScriptureChunkReviewAudit_reviewId_idx"
  ON "ScriptureChunkReviewAudit"("reviewId");

CREATE INDEX "ScriptureChunkReviewAudit_scriptureChunkId_idx"
  ON "ScriptureChunkReviewAudit"("scriptureChunkId");

CREATE INDEX "ScriptureChunkReviewAudit_reviewerUserId_idx"
  ON "ScriptureChunkReviewAudit"("reviewerUserId");

CREATE INDEX "ScriptureChunkReviewAudit_createdAt_idx"
  ON "ScriptureChunkReviewAudit"("createdAt");
