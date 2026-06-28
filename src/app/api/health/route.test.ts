import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  logStructured: vi.fn(),
  env: {
    OLLAMA_BASE_URL: "http://127.0.0.1:11434",
    SHRI_AI_CHAT_MODEL: "qwen3:8b",
    SHRI_AI_EMBEDDING_MODEL: "qwen3-embedding:0.6b",
    SHRI_AI_EMBEDDING_DIMENSIONS: 1024,
    STT_BASE_URL: "http://127.0.0.1:8001",
    STT_MODEL: "small",
    STT_SERVICE_TOKEN: "test-token-with-at-least-thirty-two-characters",
    INNGEST_EVENT_KEY: undefined as string | undefined,
    INNGEST_SIGNING_KEY: undefined as string | undefined,
    NEXT_PUBLIC_POSTHOG_HOST: undefined as string | undefined,
    NEXT_PUBLIC_POSTHOG_KEY: undefined as string | undefined,
    NEXT_PUBLIC_SENTRY_DSN: undefined as string | undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined as string | undefined,
    NEXT_PUBLIC_SUPABASE_URL: undefined as string | undefined,
    PINECONE_API_KEY: undefined as string | undefined,
    PINECONE_INDEX_DIMENSIONS: undefined as number | undefined,
    PINECONE_INDEX_NAME: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    RESEND_FROM_EMAIL: undefined as string | undefined,
    SENTRY_AUTH_TOKEN: undefined as string | undefined,
    SUPABASE_SECRET_KEY: undefined as string | undefined,
  },
}));

vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mocks.queryRaw,
  },
}));
vi.mock("@/lib/logger", () => ({
  logStructured: mocks.logStructured,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.env, {
      INNGEST_EVENT_KEY: undefined,
      INNGEST_SIGNING_KEY: undefined,
      NEXT_PUBLIC_POSTHOG_HOST: undefined,
      NEXT_PUBLIC_POSTHOG_KEY: undefined,
      NEXT_PUBLIC_SENTRY_DSN: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      PINECONE_API_KEY: undefined,
      PINECONE_INDEX_DIMENSIONS: undefined,
      PINECONE_INDEX_NAME: undefined,
      RESEND_API_KEY: undefined,
      RESEND_FROM_EMAIL: undefined,
      SENTRY_AUTH_TOKEN: undefined,
      SHRI_AI_EMBEDDING_DIMENSIONS: 1024,
      SUPABASE_SECRET_KEY: undefined,
    });
    mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo | URL) => {
        const value = String(url);
        if (value.endsWith("/api/tags")) {
          return Promise.resolve(
            Response.json({
              models: [{ name: "qwen3:8b" }, { name: "qwen3-embedding:0.6b" }],
            }),
          );
        }
        return Promise.resolve(Response.json({ status: "ok" }));
      }),
    );
  });

  it("returns ready local model and STT states", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      codes: [
        "SUPABASE_NOT_CONFIGURED",
        "PINECONE_NOT_CONFIGURED",
        "POSTHOG_NOT_CONFIGURED",
        "SENTRY_NOT_CONFIGURED",
        "RESEND_NOT_CONFIGURED",
        "INNGEST_NOT_CONFIGURED",
      ],
      components: {
        database: { status: "ready" },
        ollama: { status: "ready" },
        chatModel: { status: "ready" },
        embeddingModel: { status: "ready" },
        localStt: { status: "ready" },
        supabase: {
          status: "not_configured",
          code: "SUPABASE_NOT_CONFIGURED",
        },
      },
    });
  });

  it("returns stable missing-model states without exposing provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo | URL) => {
        const value = String(url);
        if (value.endsWith("/api/tags")) {
          return Promise.resolve(
            Response.json({ models: [{ name: "other" }] }),
          );
        }
        return Promise.resolve(Response.json({ status: "ok" }));
      }),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      codes: expect.arrayContaining([
        "LOCAL_MODEL_MISSING",
        "SUPABASE_NOT_CONFIGURED",
      ]),
      components: {
        chatModel: { status: "failed", code: "LOCAL_MODEL_MISSING" },
        embeddingModel: { status: "failed", code: "LOCAL_MODEL_MISSING" },
      },
    });
  });

  it("returns stable local-service unavailable states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      components: {
        ollama: { status: "failed", code: "LOCAL_AI_UNAVAILABLE" },
        localStt: { status: "failed", code: "LOCAL_STT_UNAVAILABLE" },
      },
    });
  });

  it("omits managed-service secrets and credential URLs from configured health output", async () => {
    Object.assign(mocks.env, {
      INNGEST_EVENT_KEY: "replace-with-inngest-event-key",
      INNGEST_SIGNING_KEY: "replace-with-inngest-signing-key",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "replace-with-posthog-key",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "replace-with-publishable-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      PINECONE_API_KEY: "replace-with-pinecone-api-key",
      PINECONE_INDEX_DIMENSIONS: 1024,
      PINECONE_INDEX_NAME: "shri-ai",
      RESEND_API_KEY: "replace-with-resend-api-key",
      RESEND_FROM_EMAIL: "noreply@example.com",
      SENTRY_AUTH_TOKEN: "replace-with-sentry-auth-token",
      SUPABASE_SECRET_KEY: "replace-with-supabase-secret-key",
    });

    const response = await GET();
    const payloadText = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(payloadText).not.toContain("replace-with-supabase-secret-key");
    expect(payloadText).not.toContain("replace-with-pinecone-api-key");
    expect(payloadText).not.toContain("replace-with-resend-api-key");
    expect(payloadText).not.toContain("replace-with-inngest-event-key");
    expect(payloadText).not.toContain("replace-with-inngest-signing-key");
    expect(payloadText).not.toContain("replace-with-sentry-auth-token");
    expect(payloadText).not.toContain("project.supabase.co");
  });
});
