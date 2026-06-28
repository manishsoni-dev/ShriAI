import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  env: {
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
    SHRI_AI_EMBEDDING_DIMENSIONS: 1024,
    SUPABASE_SECRET_KEY: undefined as string | undefined,
  },
}));

vi.mock("@/env", () => ({
  env: mocks.env,
}));

import {
  derivePineconeNamespace,
  getInngestProviderStatus,
  getPineconeProviderStatus,
  getPostHogProviderStatus,
  getResendProviderStatus,
  getSentryProviderStatus,
  getSupabaseProviderStatus,
  rejectExternalPineconeNamespace,
} from "@/lib/providers";

describe("managed provider boundaries", () => {
  beforeEach(() => {
    for (const key of Object.keys(mocks.env) as Array<keyof typeof mocks.env>) {
      if (key === "SHRI_AI_EMBEDDING_DIMENSIONS") {
        mocks.env[key] = 1024;
      } else {
        mocks.env[key] = undefined;
      }
    }
  });

  it("returns NOT_CONFIGURED states when optional providers are missing", () => {
    expect(getSupabaseProviderStatus()).toEqual({
      code: "SUPABASE_NOT_CONFIGURED",
      status: "not_configured",
    });
    expect(getPineconeProviderStatus()).toEqual({
      code: "PINECONE_NOT_CONFIGURED",
      status: "not_configured",
    });
    expect(getPostHogProviderStatus()).toEqual({
      code: "POSTHOG_NOT_CONFIGURED",
      status: "not_configured",
    });
    expect(getSentryProviderStatus()).toEqual({
      code: "SENTRY_NOT_CONFIGURED",
      status: "not_configured",
    });
    expect(getResendProviderStatus()).toEqual({
      code: "RESEND_NOT_CONFIGURED",
      status: "not_configured",
    });
    expect(getInngestProviderStatus()).toEqual({
      code: "INNGEST_NOT_CONFIGURED",
      status: "not_configured",
    });
  });

  it("derives Pinecone namespace only from workspaceId", () => {
    expect(derivePineconeNamespace("workspace-1")).toBe(
      "workspace_workspace-1",
    );
    expect(derivePineconeNamespace(" workspace:prod ")).toBe(
      "workspace_workspace_prod",
    );
  });

  it("rejects externally supplied Pinecone namespaces", () => {
    expect(() =>
      rejectExternalPineconeNamespace({
        namespace: "attacker-supplied",
        workspaceId: "workspace-1",
      }),
    ).toThrow("derived by the server");
  });

  it("rejects Pinecone dimension mismatches", () => {
    mocks.env.PINECONE_API_KEY = "replace-with-pinecone-api-key";
    mocks.env.PINECONE_INDEX_NAME = "shri-ai";
    mocks.env.PINECONE_INDEX_DIMENSIONS = 1536;

    expect(getPineconeProviderStatus()).toEqual({
      code: "PINECONE_DIMENSION_MISMATCH",
      status: "failed",
    });
  });
});
