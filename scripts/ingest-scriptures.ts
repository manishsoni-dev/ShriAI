#!/usr/bin/env tsx
/**
 * scripts/ingest-scriptures.ts
 *
 * Reads all data/scriptures/*.json files and upserts them into the database.
 * Does NOT generate embeddings — run embed-scriptures.ts after this.
 *
 * Usage:
 *   npx tsx scripts/ingest-scriptures.ts
 *   npx tsx scripts/ingest-scriptures.ts --dry-run
 *   npx tsx scripts/ingest-scriptures.ts --source=bhagavad-gita
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../src/lib/db";
import { scriptureFileSchema } from "../src/lib/rag/scripture-schema";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const includeSamples = args.includes("--include-samples");
const includeLegacy = args.includes("--include-legacy");

let sourceFilter: string | null = null;
const sourceArg = args.find((a) => a.startsWith("--source="));
if (sourceArg) {
  sourceFilter = sourceArg.split("=")[1] || null;
}

// ── Source registry ──────────────────────────────────────────────────────────

type SourceMeta = {
  canonicalTitle: string;
  tradition: string;
  language: string;
  copyrightStatus: string;
  priority: number;
};

const SOURCE_REGISTRY: Record<string, SourceMeta> = {
  "bhagavad-gita": {
    canonicalTitle: "Bhagavad Gita",
    tradition: "Vaishnava",
    language: "sanskrit",
    copyrightStatus: "public_domain",
    priority: 10,
  },
  "valmiki-ramayana": {
    canonicalTitle: "Valmiki Ramayana",
    tradition: "Vaishnava",
    language: "sanskrit",
    copyrightStatus: "public_domain",
    priority: 10,
  },
  ramcharitmanas: {
    canonicalTitle: "Ramcharitmanas",
    tradition: "Vaishnava",
    language: "hindi",
    copyrightStatus: "public_domain",
    priority: 9,
  },
};

async function main() {
  const dataDir = path.resolve(process.cwd(), "data", "scriptures");

  if (!fs.existsSync(dataDir)) {
    console.error(`✗ data/scriptures/ directory not found at ${dataDir}`);
    process.exit(1);
  }

  // Find all json files under data/scriptures/ (can be inside subdirectories like bhagavad-gita/)
  const findJsonFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.resolve(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findJsonFiles(fullPath));
      } else if (file.endsWith(".json")) {
        results.push(fullPath);
      }
    }
    return results;
  };

  let files = findJsonFiles(dataDir)
    .filter((file) => includeSamples || !file.toLowerCase().includes("sample"))
    .filter((file) => {
      if (includeLegacy) return true;
      return !file.endsWith(
        path.join("data", "scriptures", "bhagavad-gita.json"),
      );
    })
    .sort();

  if (sourceFilter) {
    files = files.filter((f) => f.includes(sourceFilter!));
  }

  if (files.length === 0) {
    console.warn("⚠  No JSON files found matching criteria.");
    return;
  }

  console.log(`\nShri AI — Scripture Ingestion${isDryRun ? " (DRY RUN)" : ""}`);
  console.log(`Found ${files.length} file(s) to process.\n`);

  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const filePath of files) {
    // derive slug from parent directory or file name
    const dirName = path.basename(path.dirname(filePath));
    const fileName = path.basename(filePath, ".json");
    // try to match registry
    let slug = dirName;
    if (!SOURCE_REGISTRY[slug]) {
      slug = fileName;
      if (!SOURCE_REGISTRY[slug]) {
        console.warn(
          `  ⚠  ${filePath}: no entry in SOURCE_REGISTRY for ${slug} — skipping`,
        );
        totalSkipped++;
        continue;
      }
    }

    let rawChunks: unknown;
    try {
      rawChunks = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (err) {
      console.error(`  ✗ ${filePath}: parse error — ${String(err)}`);
      totalErrors++;
      continue;
    }

    // Zod validation
    const validation = scriptureFileSchema.safeParse(rawChunks);
    if (!validation.success) {
      console.error(`  ✗ Validation failed for ${filePath}:`);
      console.error(validation.error.issues);
      totalErrors++;
      continue;
    }

    const validChunks = validation.data;
    const sourceMeta = {
      ...(SOURCE_REGISTRY[slug] ?? {
        canonicalTitle: validChunks[0]!.source,
        tradition: "Vaishnava",
        language: validChunks[0]!.language,
        copyrightStatus: validChunks[0]!.copyrightStatus,
        priority: validChunks[0]!.sourcePriority,
      }),
      canonicalTitle: validChunks[0]!.source,
      language: validChunks[0]!.language,
      copyrightStatus: validChunks[0]!.copyrightStatus,
      priority: Math.max(...validChunks.map((chunk) => chunk.sourcePriority)),
    };

    console.log(`  📖 ${sourceMeta.canonicalTitle} - ${filePath}`);

    // Check for duplicate IDs in file
    const ids = new Set();
    const uniqueChunks = [];
    let duplicatesInFile = 0;

    for (const chunk of validChunks) {
      if (ids.has(chunk.id)) {
        duplicatesInFile++;
      } else {
        ids.add(chunk.id);
        uniqueChunks.push(chunk);
      }
    }

    console.log(`     Records accepted: ${uniqueChunks.length}`);
    if (duplicatesInFile > 0)
      console.log(`     Duplicate records ignored: ${duplicatesInFile}`);

    if (isDryRun) {
      totalUpserted += uniqueChunks.length;
      continue;
    }

    // Upsert source
    const source = await db.scriptureSource.upsert({
      where: { canonicalTitle: sourceMeta.canonicalTitle },
      create: {
        canonicalTitle: sourceMeta.canonicalTitle,
        tradition: sourceMeta.tradition,
        language: sourceMeta.language,
        copyrightStatus: sourceMeta.copyrightStatus,
        priority: sourceMeta.priority,
      },
      update: {
        tradition: sourceMeta.tradition,
        language: sourceMeta.language,
        copyrightStatus: sourceMeta.copyrightStatus,
        priority: sourceMeta.priority,
      },
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let fileErrors = 0;

    for (const chunk of uniqueChunks) {
      try {
        const existing = await db.scriptureChunk.findUnique({
          where: {
            sourceId_canonicalRef: {
              sourceId: source.id,
              canonicalRef: chunk.canonicalRef,
            },
          },
        });

        const data = {
          sourceId: source.id,
          canonicalRef: chunk.canonicalRef,
          language: chunk.language,
          originalText: chunk.originalText ?? null,
          transliteration: chunk.transliteration ?? null,
          translation: chunk.translation,
          commentary: chunk.commentary ?? null,
          practicalNote: chunk.practicalNote ?? null,
          personaTags: chunk.personaTags,
          themeTags: chunk.themeTags,
          emotionTags: chunk.emotionTags,
          answerUseCases: chunk.answerUseCases,
        };

        if (existing) {
          await db.scriptureChunk.update({
            where: { id: existing.id },
            data,
          });
          updatedCount++;
        } else {
          await db.scriptureChunk.create({ data });
          insertedCount++;
        }
      } catch (e: unknown) {
        console.error(
          `     ✗ item (${chunk.canonicalRef}): DB error — ${String(e)}`,
        );
        fileErrors++;
      }
    }

    console.log(
      `     ✓ Inserted: ${insertedCount}, Updated: ${updatedCount}, Errors: ${fileErrors}`,
    );
    totalUpserted += insertedCount + updatedCount;
    totalErrors += fileErrors;
  }

  console.log("\n──────────────────────────────────────────");
  console.log(
    `Total: ${totalUpserted} chunks upserted, ${totalSkipped} files skipped, ${totalErrors} errors`,
  );
  if (isDryRun) {
    console.log("(Dry run — no database changes were made.)");
  } else if (totalUpserted > 0) {
    console.log("\nNext step: run embed-scriptures.ts to generate embeddings.");
    console.log("  npx tsx scripts/embed-scriptures.ts");
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
