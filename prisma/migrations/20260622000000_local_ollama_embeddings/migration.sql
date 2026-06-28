-- Existing vectors were generated with incompatible dimensions/models.
-- Clear them before changing the pgvector type; re-run local embedding scripts
-- after this migration.
UPDATE "DocumentChunk" SET "embedding" = NULL;

ALTER TABLE "DocumentChunk"
  ADD COLUMN "embeddingProvider" TEXT,
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "embeddingDimensions" INTEGER,
  ADD COLUMN "embeddingGeneratedAt" TIMESTAMP(3);

UPDATE "ScriptureChunk"
SET
  "embedding" = NULL;

ALTER TABLE "DocumentChunk"
  ALTER COLUMN "embedding" TYPE vector(1024)
  USING NULL::vector(1024);

ALTER TABLE "ScriptureChunk"
  ALTER COLUMN "embedding" TYPE vector(1024)
  USING NULL::vector(1024);
