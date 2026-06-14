-- CreateTable
CREATE TABLE "WaitlistLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "interest" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'waitlist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistLead_email_idx" ON "WaitlistLead"("email");

-- CreateIndex
CREATE INDEX "WaitlistLead_createdAt_idx" ON "WaitlistLead"("createdAt");
