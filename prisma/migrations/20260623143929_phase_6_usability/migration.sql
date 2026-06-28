/*
  Warnings:

  - The values [irrelevant_retrieval,incorrect_citation,persona_mismatch,too_long,too_short,incomplete,voice_problem,pronunciation_problem,technical_failure] on the enum `FeedbackLabel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FeedbackLabel_new" AS ENUM ('helpful', 'not_helpful', 'citation_issue', 'unsafe', 'confusing');
ALTER TABLE "UserFeedback" ALTER COLUMN "labels" TYPE "FeedbackLabel_new"[] USING ("labels"::text::"FeedbackLabel_new"[]);
ALTER TYPE "FeedbackLabel" RENAME TO "FeedbackLabel_old";
ALTER TYPE "FeedbackLabel_new" RENAME TO "FeedbackLabel";
DROP TYPE "public"."FeedbackLabel_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "researchConsentGivenAt" TIMESTAMP(3),
ADD COLUMN     "researchConsentVersion" TEXT,
ADD COLUMN     "researchConsentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN     "studyModeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UsabilityDefect" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "workflowStage" TEXT NOT NULL,
    "reproductionSteps" TEXT NOT NULL,
    "affectedDevice" TEXT,
    "linkedEventId" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsabilityDefect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsabilityDefect_severity_idx" ON "UsabilityDefect"("severity");

-- CreateIndex
CREATE INDEX "UsabilityDefect_resolutionStatus_idx" ON "UsabilityDefect"("resolutionStatus");
