/*
  Warnings:

  - You are about to drop the column `attribution` on the `ScriptureSource` table. All the data in the column will be lost.
  - You are about to drop the column `license` on the `ScriptureSource` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `ScriptureSource` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FeedbackLabel" AS ENUM ('helpful', 'not_helpful', 'irrelevant_retrieval', 'incorrect_citation', 'persona_mismatch', 'too_long', 'too_short', 'unsafe', 'incomplete', 'voice_problem', 'pronunciation_problem', 'technical_failure');

-- AlterEnum
ALTER TYPE "VoiceQaRunStatus" ADD VALUE 'invalid';

-- DropForeignKey
ALTER TABLE "AnswerCitation" DROP CONSTRAINT "AnswerCitation_chunkId_fkey";

-- DropForeignKey
ALTER TABLE "ScriptureChunk" DROP CONSTRAINT "ScriptureChunk_sourceId_fkey";

-- DropIndex
DROP INDEX "DocumentChunk_embedding_idx";

-- DropIndex
DROP INDEX "ScriptureChunk_embedding_idx";

-- DropIndex
DROP INDEX "ScriptureChunk_personaTags_idx";

-- DropIndex
DROP INDEX "ScriptureChunk_searchVector_idx";

-- DropIndex
DROP INDEX "ScriptureChunk_themeTags_idx";

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "chapter" INTEGER,
ADD COLUMN     "chunkHash" TEXT,
ADD COLUMN     "embeddingVersion" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "normalizedText" TEXT,
ADD COLUMN     "reviewStatus" "ScriptureReviewStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "scriptureName" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "tokenCount" INTEGER,
ADD COLUMN     "verseEnd" INTEGER,
ADD COLUMN     "verseStart" INTEGER;

-- AlterTable
ALTER TABLE "RetrievalLog" ALTER COLUMN "retrievedChunkIds" DROP DEFAULT,
ALTER COLUMN "selectedChunkIds" DROP DEFAULT,
ALTER COLUMN "sourceFilter" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScriptureChunk" ADD COLUMN     "chunkHash" TEXT,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "embeddingCorpusHash" TEXT,
ADD COLUMN     "embeddingDimensions" INTEGER,
ADD COLUMN     "embeddingGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingNormalized" BOOLEAN,
ADD COLUMN     "embeddingProvider" TEXT,
ADD COLUMN     "embeddingVersion" TEXT,
ADD COLUMN     "normalizedText" TEXT,
ADD COLUMN     "scriptureName" TEXT,
ADD COLUMN     "tokenCount" INTEGER,
ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "personaTags" DROP DEFAULT,
ALTER COLUMN "themeTags" DROP DEFAULT,
ALTER COLUMN "emotionTags" DROP DEFAULT,
ALTER COLUMN "answerUseCases" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScriptureChunkReview" ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "invalidationReason" TEXT,
ADD COLUMN     "reviewOrigin" TEXT NOT NULL DEFAULT 'human';

-- AlterTable
ALTER TABLE "ScriptureSource" DROP COLUMN "attribution",
DROP COLUMN "license",
DROP COLUMN "sourceUrl",
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "licenseOrUsageBasis" TEXT,
ADD COLUMN     "reviewStatus" "ScriptureReviewStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrlOrProvenanceReference" TEXT;

-- AlterTable
ALTER TABLE "VoiceQaRun" ADD COLUMN     "invalidatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "personaId" TEXT,
    "traceId" TEXT,
    "modelConfiguration" TEXT,
    "retrievalConfiguration" TEXT,
    "labels" "FeedbackLabel"[],
    "notes" TEXT,
    "triageStatus" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_conversationId_idx" ON "UserFeedback"("conversationId");

-- CreateIndex
CREATE INDEX "UserFeedback_messageId_idx" ON "UserFeedback"("messageId");

-- CreateIndex
CREATE INDEX "ScriptureChunk_personaTags_idx" ON "ScriptureChunk"("personaTags");

-- CreateIndex
CREATE INDEX "ScriptureChunk_themeTags_idx" ON "ScriptureChunk"("themeTags");

-- AddForeignKey
ALTER TABLE "ScriptureChunk" ADD CONSTRAINT "ScriptureChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ScriptureSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerCitation" ADD CONSTRAINT "AnswerCitation_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "ScriptureChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerCitation" ADD CONSTRAINT "AnswerCitation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
