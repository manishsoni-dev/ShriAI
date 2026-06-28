#!/usr/bin/env tsx
import "dotenv/config";

const OLLAMA_TIMEOUT_MS = 2500;
const STT_TIMEOUT_MS = 2500;

type FailureCode =
  | "LOCAL_AI_NOT_CONFIGURED"
  | "LOCAL_AI_UNAVAILABLE"
  | "LOCAL_MODEL_MISSING"
  | "LOCAL_STT_UNAVAILABLE";

function fail(code: FailureCode, message: string): never {
  console.error(`${code}: ${message}`);
  process.exit(1);
}

function required(name: string) {
  const value = process.env[name]?.trim();
  return value && !value.includes("replace-with") ? value : null;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const ollamaBaseUrl = required("OLLAMA_BASE_URL");
  const chatModel = required("SHRI_AI_CHAT_MODEL");
  const embeddingModel = required("SHRI_AI_EMBEDDING_MODEL");

  if (!ollamaBaseUrl || !chatModel || !embeddingModel) {
    fail(
      "LOCAL_AI_NOT_CONFIGURED",
      "Set OLLAMA_BASE_URL, SHRI_AI_CHAT_MODEL, and SHRI_AI_EMBEDDING_MODEL.",
    );
  }

  let tagsResponse: Response;
  try {
    tagsResponse = await fetchWithTimeout(
      `${ollamaBaseUrl.replace(/\/$/, "")}/api/tags`,
      OLLAMA_TIMEOUT_MS,
    );
  } catch {
    fail("LOCAL_AI_UNAVAILABLE", "Ollama did not respond to /api/tags.");
  }

  if (!tagsResponse.ok) {
    fail("LOCAL_AI_UNAVAILABLE", "Ollama returned a non-OK readiness status.");
  }

  const tags = (await tagsResponse.json().catch(() => null)) as {
    models?: Array<{ name?: unknown; model?: unknown }>;
  } | null;
  const modelNames = new Set(
    (tags?.models ?? [])
      .flatMap((model) => [model.name, model.model])
      .filter((value): value is string => typeof value === "string"),
  );
  const missing = [chatModel, embeddingModel].filter(
    (model) => !modelNames.has(model),
  );

  if (missing.length > 0) {
    fail(
      "LOCAL_MODEL_MISSING",
      `Missing Ollama model(s): ${missing.join(", ")}`,
    );
  }

  const sttBaseUrl = required("STT_BASE_URL");
  const sttToken = required("STT_SERVICE_TOKEN");
  if (!sttBaseUrl || !sttToken) {
    fail(
      "LOCAL_STT_UNAVAILABLE",
      "Set STT_BASE_URL and STT_SERVICE_TOKEN for local voice verification.",
    );
  }

  try {
    const sttResponse = await fetchWithTimeout(
      `${sttBaseUrl.replace(/\/$/, "")}/health`,
      STT_TIMEOUT_MS,
    );
    if (!sttResponse.ok) {
      fail("LOCAL_STT_UNAVAILABLE", "Local STT health endpoint is not OK.");
    }
  } catch {
    fail("LOCAL_STT_UNAVAILABLE", "Local STT service did not respond.");
  }

  console.log("Local AI readiness passed.");
}

main().catch((error) => {
  console.error(
    `LOCAL_AI_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
