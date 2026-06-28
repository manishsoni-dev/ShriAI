-- Rollback migration for Supabase auth mapping correction

-- Recreate the unique index with its old name
ALTER INDEX IF EXISTS "User_supabaseAuthUserId_key" RENAME TO "User_authUserId_key";

-- Change the PostgreSQL type back to TEXT
ALTER TABLE "User" ALTER COLUMN "supabaseAuthUserId" TYPE TEXT;

-- Rename the column from supabaseAuthUserId back to authUserId
ALTER TABLE "User" RENAME COLUMN "supabaseAuthUserId" TO "authUserId";
