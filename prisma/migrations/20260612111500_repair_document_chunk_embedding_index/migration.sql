-- Repair local databases where the original DocumentChunk pgvector index was
-- skipped or dropped while keeping fresh databases idempotent.

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_idx"
  ON "DocumentChunk" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
