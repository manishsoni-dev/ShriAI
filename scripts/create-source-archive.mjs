#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { verifySourceArchive } from "./verify-source-archive.mjs";

export const archiveExcludePathspecs = [
  ".env*",
  "**/.env*",
  ".git",
  ".git/**",
  "node_modules",
  "node_modules/**",
  ".next",
  ".next/**",
  "venv",
  "venv/**",
  ".venv",
  ".venv/**",
  "storage",
  "storage/**",
  "uploads",
  "uploads/**",
  "playwright-report",
  "playwright-report/**",
  "test-results",
  "test-results/**",
  "coverage",
  "coverage/**",
  "eval-results",
  "eval-results/**",
  "eval_output.txt",
  "*.log",
  "**/*.log",
  "*.sqlite",
  "**/*.sqlite",
  "*.sqlite3",
  "**/*.sqlite3",
  "*.db",
  "**/*.db",
  "data/evals",
  "data/evals/**",
  "eval-run-*.json",
  "**/eval-run-*.json",
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function assertCleanWorktree() {
  const status = git(["status", "--porcelain"]);
  if (status) {
    throw new Error(
      "Refusing to create a source archive from a dirty worktree. Commit or stash changes first.",
    );
  }
}

function createArchive() {
  assertCleanWorktree();
  const sha = git(["rev-parse", "--short", "HEAD"]);
  const outDir = path.resolve(process.cwd(), "dist", "source-archives");
  mkdirSync(outDir, { recursive: true });
  const archivePath = path.join(outDir, `shri-ai-source-${sha}.zip`);

  const archiveArgs = [
    "archive",
    "--format=zip",
    "--output",
    archivePath,
    "HEAD",
    "--",
    ".",
    ...archiveExcludePathspecs.map((pattern) => `:(exclude)${pattern}`),
  ];

  execFileSync("git", archiveArgs);

  verifySourceArchive(archivePath);
  return archivePath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const archivePath = createArchive();
    console.log(
      `Source archive created: ${path.relative(process.cwd(), archivePath)}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
