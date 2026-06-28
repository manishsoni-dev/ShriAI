-- P0.2 managed-services foundation: staged Supabase Auth mapping only.
-- Existing CUID User.id values and all current foreign keys remain authoritative.
ALTER TABLE "User" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
