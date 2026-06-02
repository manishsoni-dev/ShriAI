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
    OPENAI_API_KEY: z.string().min(1),
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
  },
  emptyStringAsUndefined: true,
});
