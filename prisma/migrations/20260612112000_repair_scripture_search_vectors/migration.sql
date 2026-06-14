-- Repair scripture full-text search plumbing for databases where the table was
-- created manually or before the trigger was installed.

CREATE OR REPLACE FUNCTION scripture_chunk_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'english',
    COALESCE(NEW."translation", '') || ' ' ||
    COALESCE(NEW."commentary", '') || ' ' ||
    COALESCE(NEW."practicalNote", '') || ' ' ||
    COALESCE(array_to_string(NEW."themeTags", ' '), '') || ' ' ||
    COALESCE(array_to_string(NEW."emotionTags", ' '), '') || ' ' ||
    COALESCE(array_to_string(NEW."answerUseCases", ' '), '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scripture_chunk_search_vector_update ON "ScriptureChunk";

CREATE TRIGGER scripture_chunk_search_vector_update
  BEFORE INSERT OR UPDATE ON "ScriptureChunk"
  FOR EACH ROW EXECUTE FUNCTION scripture_chunk_search_vector_trigger();

UPDATE "ScriptureChunk"
SET "searchVector" = to_tsvector(
    'english',
    COALESCE("translation", '') || ' ' ||
    COALESCE("commentary", '') || ' ' ||
    COALESCE("practicalNote", '') || ' ' ||
    COALESCE(array_to_string("themeTags", ' '), '') || ' ' ||
    COALESCE(array_to_string("emotionTags", ' '), '') || ' ' ||
    COALESCE(array_to_string("answerUseCases", ' '), '')
  ),
  "updatedAt" = NOW()
WHERE "searchVector" IS NULL;

CREATE INDEX IF NOT EXISTS "ScriptureChunk_searchVector_idx"
  ON "ScriptureChunk" USING GIN("searchVector");
