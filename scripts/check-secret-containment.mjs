#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const allowedEnvFiles = new Set([".env.example"]);
const skippedContentFiles = new Set([
  "package-lock.json",
  "data/evals/scripture-retrieval/runs/eval-run-baseline-v1-2026-06-23T13-31-58-775Z.json",
  "data/evals/scripture-retrieval/runs/eval-run-baseline-v1-2026-06-23T13-34-02-862Z.json",
]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const secretPatterns = [
  {
    name: "OpenAI API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g,
  },
  {
    name: "Anthropic API key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/g,
  },
  {
    name: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{32,}\b/g,
  },
  {
    name: "JWT-like token",
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: "Private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
];

function gitLsFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean);
}

function isForbiddenEnvPath(file) {
  const base = path.basename(file);
  if (!base.startsWith(".env")) return false;
  return !allowedEnvFiles.has(file);
}

function shouldScanContent(file) {
  if (skippedContentFiles.has(file)) return false;
  const base = path.basename(file);
  if (base === ".env.example") return true;
  return textExtensions.has(path.extname(file));
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

function envExampleHasUnsafeLiteral(text) {
  const findings = [];
  const lines = text.split("\n");
  for (const [index, line] of lines.entries()) {
    if (/^\s*#/.test(line) || !line.includes("=")) continue;
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey.trim();
    const value = rest
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!value) continue;
    if (
      /replace-with|localhost|127\.0\.0\.1|postgres:postgres|qwen3|small|development|staging|true|false|^\d+$|^$/.test(
        value,
      )
    ) {
      continue;
    }
    if (/(SECRET|TOKEN|KEY|PASSWORD)/.test(key)) {
      findings.push(`.env.example:${index + 1} has a non-placeholder ${key}`);
    }
  }
  return findings;
}

const files = gitLsFiles();
const findings = [];

for (const file of files) {
  if (isForbiddenEnvPath(file)) {
    findings.push(`${file}: tracked real environment file`);
  }
}

for (const file of files) {
  if (!shouldScanContent(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (file === ".env.example") {
    findings.push(...envExampleHasUnsafeLiteral(text));
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push(
        `${file}:${lineNumberForIndex(text, match.index ?? 0)} ${name}`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error("Secret containment check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(
  "Secret containment check passed: no tracked env files or known secret patterns found.",
);
