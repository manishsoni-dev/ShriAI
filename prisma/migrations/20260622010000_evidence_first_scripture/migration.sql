ALTER TABLE "ScriptureSource"
  ADD COLUMN "manifestId" TEXT,
  ADD COLUMN "edition" TEXT,
  ADD COLUMN "translator" TEXT,
  ADD COLUMN "license" TEXT,
  ADD COLUMN "attribution" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "ingestionDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "ScriptureSource_manifestId_key"
  ON "ScriptureSource"("manifestId");

ALTER TABLE "ScriptureChunk"
  ADD COLUMN "chapter" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "verseStart" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "verseEnd" INTEGER NOT NULL DEFAULT 1;

UPDATE "ScriptureChunk"
SET
  "chapter" = CASE
    WHEN "canonicalRef" ~ '^[0-9]+\.[0-9]+' THEN split_part("canonicalRef", '.', 1)::INTEGER
    ELSE 1
  END,
  "verseStart" = CASE
    WHEN "canonicalRef" ~ '^[0-9]+\.[0-9]+' THEN regexp_replace(split_part("canonicalRef", '.', 2), '-.*$', '')::INTEGER
    WHEN "canonicalRef" ~ '^[0-9]+$' THEN "canonicalRef"::INTEGER
    ELSE 1
  END,
  "verseEnd" = CASE
    WHEN "canonicalRef" ~ '^[0-9]+\.[0-9]+-[0-9]+' THEN split_part(split_part("canonicalRef", '.', 2), '-', 2)::INTEGER
    WHEN "canonicalRef" ~ '^[0-9]+\.[0-9]+' THEN regexp_replace(split_part("canonicalRef", '.', 2), '-.*$', '')::INTEGER
    WHEN "canonicalRef" ~ '^[0-9]+$' THEN "canonicalRef"::INTEGER
    ELSE 1
  END;

CREATE INDEX "ScriptureChunk_chapter_verseStart_verseEnd_idx"
  ON "ScriptureChunk"("chapter", "verseStart", "verseEnd");
