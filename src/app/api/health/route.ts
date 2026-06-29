import { NextResponse } from "next/server";

import { env } from "@/env";
import { db } from "@/lib/db";
import { logStructured } from "@/lib/logger";
import {
  getInngestProviderStatus,
  getPineconeProviderStatus,
  getPostHogProviderStatus,
  getResendProviderStatus,
  getSentryProviderStatus,
  getSupabaseProviderStatus,
} from "@/lib/providers";
import { getRolloutHealth } from "@/lib/supabase/rollout";
import type { ProviderAvailabilityCode } from "@/lib/providers/status";

export const dynamic = "force-dynamic";

type HealthCode =
  | "DATABASE_UNAVAILABLE"
  | ProviderAvailabilityCode
  | "LOCAL_AI_NOT_CONFIGURED"
  | "LOCAL_AI_UNAVAILABLE"
  | "LOCAL_MODEL_MISSING"
  | "LOCAL_STT_UNAVAILABLE";

type ComponentHealth =
  | { code: HealthCode; status: "not_configured" }
  | { status: "ready" }
  | { code: HealthCode; status: "failed" };

type OllamaTagsResponse = {
  models?: Array<{ name?: unknown; model?: unknown }>;
};

function failed(code: HealthCode): ComponentHealth {
  return { code, status: "failed" };
}

function ready(): ComponentHealth {
  return { status: "ready" };
}

function providerComponent(
  status: ReturnType<typeof getSupabaseProviderStatus>,
): ComponentHealth {
  if (status.status === "configured") {
    return ready();
  }

  return status;
}

async function checkDatabase(): Promise<ComponentHealth> {
  try {
    await db.$queryRaw`SELECT 1`;
    return ready();
  } catch {
    return failed("DATABASE_UNAVAILABLE");
  }
}

async function checkOllamaModels(): Promise<{
  ollama: ComponentHealth;
  chatModel: ComponentHealth;
  embeddingModel: ComponentHealth;
}> {
  if (
    !env.OLLAMA_BASE_URL ||
    !env.SHRI_AI_CHAT_MODEL ||
    !env.SHRI_AI_EMBEDDING_MODEL
  ) {
    const notConfigured = failed("LOCAL_AI_NOT_CONFIGURED");
    return {
      ollama: notConfigured,
      chatModel: notConfigured,
      embeddingModel: notConfigured,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2_500),
    });
  } catch {
    const unavailable = failed("LOCAL_AI_UNAVAILABLE");
    return {
      ollama: unavailable,
      chatModel: unavailable,
      embeddingModel: unavailable,
    };
  }

  if (!response.ok) {
    const unavailable = failed("LOCAL_AI_UNAVAILABLE");
    return {
      ollama: unavailable,
      chatModel: unavailable,
      embeddingModel: unavailable,
    };
  }

  const payload = (await response
    .json()
    .catch(() => null)) as OllamaTagsResponse | null;
  const modelNames = new Set(
    (payload?.models ?? [])
      .flatMap((model) => [model.name, model.model])
      .filter((value): value is string => typeof value === "string"),
  );

  return {
    ollama: ready(),
    chatModel: modelNames.has(env.SHRI_AI_CHAT_MODEL)
      ? ready()
      : failed("LOCAL_MODEL_MISSING"),
    embeddingModel: modelNames.has(env.SHRI_AI_EMBEDDING_MODEL)
      ? ready()
      : failed("LOCAL_MODEL_MISSING"),
  };
}

async function checkLocalStt(): Promise<ComponentHealth> {
  if (!env.STT_SERVICE_TOKEN) {
    return failed("LOCAL_STT_UNAVAILABLE");
  }

  try {
    const response = await fetch(`${env.STT_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2_500),
    });
    return response.ok ? ready() : failed("LOCAL_STT_UNAVAILABLE");
  } catch {
    return failed("LOCAL_STT_UNAVAILABLE");
  }
}

function hasFailure(components: Record<string, ComponentHealth>) {
  return Object.values(components).some(
    (component) => component.status === "failed",
  );
}

export async function GET() {
  const [database, localAi, localStt] = await Promise.all([
    checkDatabase(),
    checkOllamaModels(),
    checkLocalStt(),
  ]);
  const components = {
    database,
    ollama: localAi.ollama,
    chatModel: localAi.chatModel,
    embeddingModel: localAi.embeddingModel,
    localStt,
    supabase: providerComponent(getSupabaseProviderStatus()),
    pinecone: providerComponent(getPineconeProviderStatus()),
    posthog: providerComponent(getPostHogProviderStatus()),
    sentry: providerComponent(getSentryProviderStatus()),
    resend: providerComponent(getResendProviderStatus()),
    inngest: providerComponent(getInngestProviderStatus()),
  };

  const supabase_auth_rollout = getRolloutHealth();
  const status = hasFailure(components) ? "degraded" : "ok";
  const codes = Object.values(components)
    .map((component) => ("code" in component ? component.code : null))
    .filter((code): code is HealthCode => Boolean(code));

  logStructured(status === "ok" ? "info" : "warn", "Healthcheck completed", {
    route: "/api/health",
    status: status === "ok" ? 200 : 503,
    codes,
  });

  return NextResponse.json(
    {
      status,
      components,
      codes,
      models: {
        chat: env.SHRI_AI_CHAT_MODEL,
        embedding: env.SHRI_AI_EMBEDDING_MODEL,
        stt: env.STT_MODEL,
      },
      supabase_auth_rollout,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
