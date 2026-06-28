#!/usr/bin/env tsx

import * as fs from "node:fs";
import * as path from "node:path";

import { scriptureFileSchema } from "../src/lib/rag/scripture-schema";
import {
  getManifestSource,
  isManifestSourceEligible,
} from "../src/lib/rag/source-manifest";

const args = process.argv.slice(2);
const includeSamples = args.includes("--include-samples");
const includeLegacy = args.includes("--include-legacy");
const sourceArg = args.find((arg) => arg.startsWith("--source="));
const sourceFilter = sourceArg?.split("=")[1] ?? null;
const minimumArg = args.find((arg) => arg.startsWith("--minimum="));
const minimumRecords = Number(minimumArg?.split("=")[1] ?? 300);

function findJsonFiles(dir: string): string[] {
  let results: string[] = [];

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(findJsonFiles(fullPath));
    } else if (file.endsWith(".json") && file !== "source-manifest.json") {
      results.push(fullPath);
    }
  }

  return results;
}

function shouldIncludeFile(filePath: string) {
  if (!includeSamples && filePath.toLowerCase().includes("sample"))
    return false;
  if (
    !includeLegacy &&
    filePath.endsWith(path.join("data", "scriptures", "bhagavad-gita.json"))
  ) {
    return false;
  }
  if (sourceFilter && !filePath.includes(sourceFilter)) return false;
  return true;
}

function fail(message: string) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

async function main() {
  const dataDir = path.resolve(process.cwd(), "data", "scriptures");
  if (!fs.existsSync(dataDir)) {
    fail(`Missing scripture directory: ${dataDir}`);
    return;
  }

  const files = findJsonFiles(dataDir).filter(shouldIncludeFile).sort();
  if (files.length === 0) {
    fail("No scripture JSON files found.");
    return;
  }

  const seenRefs = new Map<string, string>();
  let totalRecords = 0;

  for (const filePath of files) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const result = scriptureFileSchema.safeParse(raw);

    if (!result.success) {
      fail(`${filePath}: schema validation failed`);
      console.error(result.error.issues);
      continue;
    }

    const dirName = path.basename(path.dirname(filePath));
    const fileName = path.basename(filePath, ".json");
    const slug = dirName === "scriptures" ? fileName : dirName;
    let manifestSource;
    try {
      manifestSource = getManifestSource({ slug });
    } catch (error) {
      fail(`${filePath}: ${String(error)}`);
      continue;
    }
    if (!isManifestSourceEligible(manifestSource)) {
      fail(
        `${filePath}: manifest source is not legally eligible for ingestion`,
      );
      continue;
    }

    for (const record of result.data) {
      totalRecords++;

      const existingFile = seenRefs.get(record.canonicalRef);
      if (existingFile) {
        fail(
          `${record.canonicalRef} appears in both ${existingFile} and ${filePath}`,
        );
      } else {
        seenRefs.set(record.canonicalRef, filePath);
      }

      if (
        record.source !== manifestSource.canonicalTitle ||
        record.language !== manifestSource.language
      ) {
        fail(
          `${record.canonicalRef}: source title/language differs from manifest`,
        );
      }

      if (
        record.sourceUrl &&
        (!manifestSource.sourceUrl ||
          !record.sourceUrl.startsWith(manifestSource.sourceUrl))
      ) {
        fail(
          `${record.canonicalRef}: sourceUrl differs from manifest authority`,
        );
      }
    }

    console.log(`✓ ${filePath}: ${result.data.length} records`);
  }

  if (minimumRecords > 0 && totalRecords < minimumRecords) {
    fail(`Expected at least ${minimumRecords} records, found ${totalRecords}`);
  }

  if (!process.exitCode) {
    console.log(`\nScripture validation: OK (${totalRecords} records)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
