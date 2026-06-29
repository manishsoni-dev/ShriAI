-- P0.2 managed-services foundation correction.
-- Add the future Supabase Auth identity link as a nullable UUID while
-- preserving current CUID User.id primary keys and all existing foreign keys.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" UUID;

-- If an earlier local P0.2 draft introduced a generic text authUserId column,
-- migrate only valid UUID-looking values and remove the generic column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'authUserId'
  ) THEN
    EXECUTE $sql$
      UPDATE "User"
      SET "supabaseAuthUserId" = "authUserId"::uuid
      WHERE "authUserId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND "supabaseAuthUserId" IS NULL
    $sql$;

    DROP INDEX IF EXISTS "User_authUserId_key";
    ALTER TABLE "User" DROP COLUMN "authUserId";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseAuthUserId_key"
  ON "User"("supabaseAuthUserId");
