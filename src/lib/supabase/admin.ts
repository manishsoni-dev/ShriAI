import "server-only";
import { createClient as _createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { SUPABASE_NOT_CONFIGURED, type SupabaseHealthState } from "./health";

export function createAdminClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return {
      status: SUPABASE_NOT_CONFIGURED as SupabaseHealthState,
      client: null,
    };
  }

  const client = _createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return { status: "CONFIGURED" as SupabaseHealthState, client };
}
