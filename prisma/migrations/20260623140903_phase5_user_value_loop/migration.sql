-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sourceScope" TEXT NOT NULL DEFAULT 'any';

-- CreateTable
CREATE TABLE "SavedAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "personaId" TEXT,
    "answerSnapshot" TEXT NOT NULL,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedAnswerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "personaId" TEXT,
    "traceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedAnswer_userId_idx" ON "SavedAnswer"("userId");

-- CreateIndex
CREATE INDEX "SavedAnswer_workspaceId_idx" ON "SavedAnswer"("workspaceId");

-- CreateIndex
CREATE INDEX "SavedAnswer_userId_workspaceId_idx" ON "SavedAnswer"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "SavedAnswer_messageId_idx" ON "SavedAnswer"("messageId");

-- CreateIndex
CREATE INDEX "Reflection_userId_idx" ON "Reflection"("userId");

-- CreateIndex
CREATE INDEX "Reflection_savedAnswerId_idx" ON "Reflection"("savedAnswerId");

-- CreateIndex
CREATE INDEX "ProductEvent_eventType_idx" ON "ProductEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProductEvent_userId_idx" ON "ProductEvent"("userId");

-- CreateIndex
CREATE INDEX "ProductEvent_workspaceId_idx" ON "ProductEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "SavedAnswer" ADD CONSTRAINT "SavedAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_savedAnswerId_fkey" FOREIGN KEY ("savedAnswerId") REFERENCES "SavedAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
