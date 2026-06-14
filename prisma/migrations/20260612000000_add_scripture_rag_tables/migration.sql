-- Scripture RAG tables
-- Migration: add_scripture_rag_tables

-- ── ScriptureSource ─────────────────────────────────────────────────────────
CREATE TABLE "ScriptureSource" (
  "id"              TEXT NOT NULL,
  "canonicalTitle"  TEXT NOT NULL,
  "tradition"       TEXT NOT NULL,
  "language"        TEXT NOT NULL DEFAULT 'sanskrit',
  "copyrightStatus" TEXT NOT NULL DEFAULT 'public_domain',
  "priority"        INTEGER NOT NULL DEFAULT 5,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptureSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScriptureSource_canonicalTitle_key" ON "ScriptureSource"("canonicalTitle");
CREATE INDEX "ScriptureSource_tradition_idx" ON "ScriptureSource"("tradition");
CREATE INDEX "ScriptureSource_priority_idx" ON "ScriptureSource"("priority");

-- ── ScriptureChunk ──────────────────────────────────────────────────────────
-- Requires pgvector extension (already enabled by DocumentChunk migration)
CREATE TABLE "ScriptureChunk" (
  "id"              TEXT NOT NULL,
  "sourceId"        TEXT NOT NULL,
  "canonicalRef"    TEXT NOT NULL,
  "language"        TEXT NOT NULL DEFAULT 'sanskrit',
  "originalText"    TEXT,
  "transliteration" TEXT,
  "translation"     TEXT NOT NULL,
  "commentary"      TEXT,
  "practicalNote"   TEXT,
  "personaTags"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "themeTags"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "emotionTags"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "answerUseCases"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "embedding"       vector(1536),
  "searchVector"    tsvector,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptureChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScriptureChunk_sourceId_fkey" FOREIGN KEY ("sourceId")
    REFERENCES "ScriptureSource"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ScriptureChunk_sourceId_canonicalRef_key"
  ON "ScriptureChunk"("sourceId", "canonicalRef");
CREATE INDEX "ScriptureChunk_sourceId_idx" ON "ScriptureChunk"("sourceId");
-- GIN index for fast array containment checks (@>)
CREATE INDEX "ScriptureChunk_personaTags_idx" ON "ScriptureChunk" USING GIN("personaTags");
CREATE INDEX "ScriptureChunk_themeTags_idx"   ON "ScriptureChunk" USING GIN("themeTags");
-- GIN index for full-text search
CREATE INDEX "ScriptureChunk_searchVector_idx" ON "ScriptureChunk" USING GIN("searchVector");
-- IVFFlat index for approximate nearest-neighbour vector search
-- (Use 'lists' ≈ sqrt(row_count). Rebuild after corpus grows significantly.)
CREATE INDEX "ScriptureChunk_embedding_idx"
  ON "ScriptureChunk" USING ivfflat("embedding" vector_cosine_ops)
  WITH (lists = 10);

-- Auto-update searchVector whenever translation, commentary, themeTags or emotionTags change
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

CREATE TRIGGER scripture_chunk_search_vector_update
  BEFORE INSERT OR UPDATE ON "ScriptureChunk"
  FOR EACH ROW EXECUTE FUNCTION scripture_chunk_search_vector_trigger();

-- ── RetrievalLog ────────────────────────────────────────────────────────────
CREATE TABLE "RetrievalLog" (
  "id"                TEXT NOT NULL,
  "query"             TEXT NOT NULL,
  "personaId"         TEXT NOT NULL,
  "retrievedChunkIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "selectedChunkIds"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "latencyMs"         INTEGER NOT NULL,
  "sourceFilter"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "resultCount"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RetrievalLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RetrievalLog_personaId_idx" ON "RetrievalLog"("personaId");
CREATE INDEX "RetrievalLog_createdAt_idx" ON "RetrievalLog"("createdAt");

-- ── AnswerCitation ───────────────────────────────────────────────────────────
CREATE TABLE "AnswerCitation" (
  "id"        TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "chunkId"   TEXT NOT NULL,
  "score"     DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnswerCitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnswerCitation_chunkId_fkey" FOREIGN KEY ("chunkId")
    REFERENCES "ScriptureChunk"("id") ON DELETE CASCADE
);

CREATE INDEX "AnswerCitation_messageId_idx" ON "AnswerCitation"("messageId");
CREATE INDEX "AnswerCitation_chunkId_idx"   ON "AnswerCitation"("chunkId");
