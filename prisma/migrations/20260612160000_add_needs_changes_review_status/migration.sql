-- Add the requested review status without dropping the legacy enum value.
-- Existing rows are migrated in the next migration after this value is available.

ALTER TYPE "ScriptureReviewStatus" ADD VALUE IF NOT EXISTS 'needs_changes';
