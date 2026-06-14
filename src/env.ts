import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AI_CHAT_MODEL: z.string().min(1).default("gpt-5-mini"),
    AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
    AI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
    AI_TEXT_MODEL: z.string().min(1).default("gpt-5-mini"),
    AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    // Voice API keys are optional. Text fallback should still render without them.
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    DEEPGRAM_API_KEY: z.string().min(1).optional(),
    GOOGLE_API_KEY: z.string().min(1).optional(),
    STT_PROVIDER: z.enum(["openai", "deepgram", "google"]).default("openai"),
    REVIEWER_EMAILS: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),
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
    AI_CHAT_MODEL: process.env.AI_CHAT_MODEL,
    AI_EMBEDDING_DIMENSIONS: process.env.AI_EMBEDDING_DIMENSIONS,
    AI_EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL,
    AI_TEXT_MODEL: process.env.AI_TEXT_MODEL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    STT_PROVIDER: process.env.STT_PROVIDER,
    REVIEWER_EMAILS: process.env.REVIEWER_EMAILS,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
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
