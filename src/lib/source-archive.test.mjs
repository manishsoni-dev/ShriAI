import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  findProhibitedArchivePaths,
  prohibitedArchivePatterns,
} from "../../scripts/verify-source-archive.mjs";

describe("source archive verification", () => {
  it("export-ignores env placeholders and eval outputs before archiving", () => {
    const attributes = readFileSync(".gitattributes", "utf8");
    expect(attributes).toContain(".env* export-ignore");
    expect(attributes).toContain("data/evals/** export-ignore");
  });

  it("rejects env files and runtime artifacts", () => {
    expect(
      findProhibitedArchivePaths([
        "README.md",
        ".env",
        ".env.local",
        ".git/config",
        "node_modules/react/index.js",
        ".next/server/app.js",
        "storage/documents/private.pdf",
        "uploads/local.txt",
        "test-results/results.json",
        "server.log",
      ]),
    ).toEqual([
      ".env",
      ".env.local",
      ".git/config",
      "node_modules/react/index.js",
      ".next/server/app.js",
      "storage/documents/private.pdf",
      "uploads/local.txt",
      "test-results/results.json",
      "server.log",
    ]);
  });

  it("keeps an explicit denylist for unsafe source archives", () => {
    expect(prohibitedArchivePatterns.length).toBeGreaterThanOrEqual(10);
  });
});
