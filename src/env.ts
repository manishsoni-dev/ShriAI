import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const NEXT_PRODUCTION_BUILD_PHASE = "phase-production-build";
const BUILD_TIME_AUTH_SECRET =
  "build-time-placeholder-auth-secret-at-least-32-chars";
const BUILD_TIME_DATABASE_URL =
  "postgresql://build:build@localhost:5432/shri_ai_build?schema=public";

export const env = createEnv({
  server: {
    OLLAMA_BASE_URL: loopbackUrl().default("http://127.0.0.1:11434"),
    SHRI_AI_CHAT_MODEL: z.string().min(1).default("qwen3:8b"),
    SHRI_AI_EMBEDDING_MODEL: z.string().min(1).default("qwen3-embedding:0.6b"),
    SHRI_AI_EMBEDDING_DIMENSIONS: z.coerce
      .number()
      .int()
      .positive()
      .default(1024),
    SHRI_AI_CHAT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(120_000),
    SHRI_AI_EMBEDDING_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(30_000),
    STT_BASE_URL: loopbackUrl().default("http://127.0.0.1:8001"),
    STT_MODEL: z.string().min(1).default("small"),
    STT_TIMEOUT_MS: z.coerce.number().int().positive().default(100_000),
    STT_SERVICE_TOKEN: z.string().min(32).optional(),
    AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    PINECONE_API_KEY: z.string().min(1).optional(),
    PINECONE_INDEX_NAME: z.string().min(1).optional(),
    PINECONE_INDEX_DIMENSIONS: z.coerce.number().int().positive().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    REVIEWER_EMAILS: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),
    STAGING_ALLOWLIST: z.string().optional(),
    RELEASE_ENVIRONMENT: z.string().min(1).default("development"),
    RELEASE_MIN_VOICE_APPROVED_CHUNKS: z.coerce
      .number()
      .int()
      .min(0)
      .default(1),
    RELEASE_MIN_VOICE_APPROVED_PERCENT: z.coerce
      .number()
      .min(0)
      .max(100)
      .default(1),
    RELEASE_REQUIRE_COMPLETED_VOICE_QA: z
      .enum(["true", "false"])
      .default("true"),
    ENABLE_BETA_INVITES: z.enum(["true", "false"]).default("true"),
    OLLAMA_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
    WHISPER_MAX_CONCURRENCY: z.coerce.number().int().positive().default(1),
    SUPABASE_AUTH_NEW_ACCOUNT_ENABLED: z
      .enum(["true", "false"])
      .default("false"),
    SUPABASE_AUTH_LINKED_SIGNIN_ENABLED: z
      .enum(["true", "false"])
      .default("false"),
    SUPABASE_AUTH_STAGING_ONLY: z.enum(["true", "false"]).default("false"),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://shri.local"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    SHRI_AI_CHAT_MODEL: process.env.SHRI_AI_CHAT_MODEL,
    SHRI_AI_EMBEDDING_MODEL: process.env.SHRI_AI_EMBEDDING_MODEL,
    SHRI_AI_EMBEDDING_DIMENSIONS: process.env.SHRI_AI_EMBEDDING_DIMENSIONS,
    SHRI_AI_CHAT_TIMEOUT_MS: process.env.SHRI_AI_CHAT_TIMEOUT_MS,
    SHRI_AI_EMBEDDING_TIMEOUT_MS: process.env.SHRI_AI_EMBEDDING_TIMEOUT_MS,
    STT_BASE_URL: process.env.STT_BASE_URL,
    STT_MODEL: process.env.STT_MODEL,
    STT_TIMEOUT_MS: process.env.STT_TIMEOUT_MS,
    STT_SERVICE_TOKEN: process.env.STT_SERVICE_TOKEN,
    AUTH_SECRET: buildTimeOnlyPlaceholder(
      process.env.AUTH_SECRET,
      BUILD_TIME_AUTH_SECRET,
    ),
    DATABASE_URL: buildTimeOnlyPlaceholder(
      process.env.DATABASE_URL,
      BUILD_TIME_DATABASE_URL,
    ),
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    PINECONE_INDEX_DIMENSIONS: process.env.PINECONE_INDEX_DIMENSIONS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    REVIEWER_EMAILS: process.env.REVIEWER_EMAILS,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    STAGING_ALLOWLIST: process.env.STAGING_ALLOWLIST,
    RELEASE_ENVIRONMENT: process.env.RELEASE_ENVIRONMENT,
    RELEASE_MIN_VOICE_APPROVED_CHUNKS:
      process.env.RELEASE_MIN_VOICE_APPROVED_CHUNKS,
    RELEASE_MIN_VOICE_APPROVED_PERCENT:
      process.env.RELEASE_MIN_VOICE_APPROVED_PERCENT,
    RELEASE_REQUIRE_COMPLETED_VOICE_QA:
      process.env.RELEASE_REQUIRE_COMPLETED_VOICE_QA,
    ENABLE_BETA_INVITES: process.env.ENABLE_BETA_INVITES,
    OLLAMA_MAX_CONCURRENCY: process.env.OLLAMA_MAX_CONCURRENCY,
    WHISPER_MAX_CONCURRENCY: process.env.WHISPER_MAX_CONCURRENCY,
    SUPABASE_AUTH_NEW_ACCOUNT_ENABLED:
      process.env.SUPABASE_AUTH_NEW_ACCOUNT_ENABLED,
    SUPABASE_AUTH_LINKED_SIGNIN_ENABLED:
      process.env.SUPABASE_AUTH_LINKED_SIGNIN_ENABLED,
    SUPABASE_AUTH_STAGING_ONLY: process.env.SUPABASE_AUTH_STAGING_ONLY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  emptyStringAsUndefined: true,
});

function buildTimeOnlyPlaceholder(
  value: string | undefined,
  placeholder: string,
) {
  if (value !== undefined && value !== "") {
    return value;
  }

  return process.env.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE
    ? placeholder
    : undefined;
}

function loopbackUrl() {
  return z
    .string()
    .url()
    .refine(
      (value) => {
        const hostname = new URL(value).hostname;
        return (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1" ||
          hostname === "[::1]"
        );
      },
      { message: "Local AI services must use a loopback URL." },
    );
}
