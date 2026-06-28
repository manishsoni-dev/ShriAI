ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "languagePreference" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "microphoneConsentGivenAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "microphoneConsentVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3);
