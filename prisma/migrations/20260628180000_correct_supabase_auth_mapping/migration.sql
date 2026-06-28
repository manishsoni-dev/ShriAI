-- Verifies existing non-null authUserId values are valid UUIDs before changing anything
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        WHERE "authUserId" IS NOT NULL
          AND "authUserId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) THEN
        RAISE EXCEPTION 'Aborting migration: Found invalid non-null authUserId values that are not valid UUIDs.';
    END IF;
END $$;

-- Rename the column from authUserId to supabaseAuthUserId
ALTER TABLE "User" RENAME COLUMN "authUserId" TO "supabaseAuthUserId";

-- Change the PostgreSQL type to UUID safely
ALTER TABLE "User" ALTER COLUMN "supabaseAuthUserId" TYPE UUID USING "supabaseAuthUserId"::uuid;

-- Recreate the unique index with an explicit Supabase-specific name
ALTER INDEX IF EXISTS "User_authUserId_key" RENAME TO "User_supabaseAuthUserId_key";
