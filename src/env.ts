import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

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
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    REVIEWER_EMAILS: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),
    STAGING_ALLOWLIST: z.string().optional(),
    RELEASE_ENVIRONMENT: z.string().min(1).default("staging"),
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
  },
  client: {},
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
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
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
  },
  emptyStringAsUndefined: true,
});

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
