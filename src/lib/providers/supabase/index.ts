import "server-only";

import { env } from "@/env";
import {
  configured,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type SupabaseBoundary = {
  provider: "supabase";
  publishableClientConfigured: true;
  serverClientConfigured: true;
};

let boundary: SupabaseBoundary | undefined;

export function getSupabaseProviderStatus() {
  if (
    !hasAllValues([
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      env.SUPABASE_SECRET_KEY,
    ])
  ) {
    return notConfigured("SUPABASE_NOT_CONFIGURED");
  }

  return configured();
}

export function getSupabaseBoundary(): SupabaseBoundary | null {
  if (getSupabaseProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    provider: "supabase",
    publishableClientConfigured: true,
    serverClientConfigured: true,
  };

  return boundary;
}
