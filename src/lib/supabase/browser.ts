import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";
import { SUPABASE_NOT_CONFIGURED, type SupabaseHealthState } from "./health";

export function createBrowserClient() {
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      status: SUPABASE_NOT_CONFIGURED as SupabaseHealthState,
      client: null,
    };
  }

  const client = _createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return { status: "CONFIGURED" as SupabaseHealthState, client };
}
