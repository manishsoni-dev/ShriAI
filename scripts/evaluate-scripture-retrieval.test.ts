import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

function makeEvalFile() {
  const dir = mkdtempSync(path.join(tmpdir(), "shri-eval-"));
  const evalPath = path.join(dir, "evidence.json");
  const cases = Array.from({ length: 30 }, (_, index) => ({
    id: `case-${index + 1}`,
    question: "What is dharma?",
    personaId: "krishna",
    expectedRefs: ["2.47"],
    expectedBehavior: "grounded",
  }));
  writeFileSync(evalPath, JSON.stringify({ cases }));
  return evalPath;
}

describe("evaluate-scripture-retrieval local AI failure handling", () => {
  it("fails fast with a stable code and preserves existing eval artifacts", () => {
    const before = new Set(readdirSync("data/evals/scripture-retrieval/runs"));
    const evalPath = makeEvalFile();

    let output = "";
    try {
      execFileSync(
        "npx",
        [
          "tsx",
          "scripts/evaluate-scripture-retrieval.ts",
          `--file=${evalPath}`,
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            AUTH_SECRET: "test-auth-secret-at-least-32-characters",
            DATABASE_URL:
              "postgresql://postgres:postgres@localhost:5432/shri_ai?schema=public",
            OLLAMA_BASE_URL: "http://127.0.0.1:9",
            SHRI_AI_CHAT_MODEL: "qwen3:8b",
            SHRI_AI_EMBEDDING_MODEL: "qwen3-embedding:0.6b",
            SCRIPTURE_EVAL_CASE_TIMEOUT_MS: "25",
          },
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 10_000,
        },
      );
    } catch (error) {
      output =
        typeof error === "object" && error && "stderr" in error
          ? String((error as { stderr: Buffer | string }).stderr)
          : String(error);
    }

    expect(output).toContain("LOCAL_AI_UNAVAILABLE");
    const after = new Set(readdirSync("data/evals/scripture-retrieval/runs"));
    expect(after).toEqual(before);
  }, 15_000);
});
