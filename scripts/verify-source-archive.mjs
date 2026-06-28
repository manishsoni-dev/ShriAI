#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export const prohibitedArchivePatterns = [
  /^\.env(?:\.|$)/,
  /(^|\/)\.env(?:\.|$)/,
  /^\.git(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /^\.next(?:\/|$)/,
  /^venv(?:\/|$)/,
  /^\.venv(?:\/|$)/,
  /^storage(?:\/|$)/,
  /^uploads(?:\/|$)/,
  /^playwright-report(?:\/|$)/,
  /^test-results(?:\/|$)/,
  /^coverage(?:\/|$)/,
  /^eval-results(?:\/|$)/,
  /^eval_output\.txt$/,
  /(^|\/).*\.log$/,
  /(^|\/).*\.(sqlite|sqlite3|db)$/,
  /^data\/evals(?:\/|$)/,
  /(^|\/)eval-run-.*\.json$/,
];

export function findProhibitedArchivePaths(paths) {
  return paths.filter((entry) =>
    prohibitedArchivePatterns.some((pattern) => pattern.test(entry)),
  );
}

function listArchive(path) {
  const output = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function verifySourceArchive(path) {
  if (!existsSync(path)) {
    throw new Error(`Archive not found: ${path}`);
  }
  const paths = listArchive(path);
  const prohibited = findProhibitedArchivePaths(paths);
  if (prohibited.length > 0) {
    throw new Error(
      `Archive contains prohibited paths: ${prohibited.join(", ")}`,
    );
  }
  return { entries: paths.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const archivePath = process.argv[2];
  if (!archivePath) {
    console.error(
      "Usage: node scripts/verify-source-archive.mjs <archive.zip>",
    );
    process.exit(2);
  }
  try {
    const result = verifySourceArchive(archivePath);
    console.log(`Archive verification passed: ${result.entries} entries.`);
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : `Archive verification failed: ${String(error)}`,
    );
    process.exit(1);
  }
}
