import "server-only";
import { env } from "@/env";

function isSupabaseConfigured(): boolean {
  return !!(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isNewAccountEnabled(): boolean {
  return (
    env.SUPABASE_AUTH_NEW_ACCOUNT_ENABLED === "true" && isSupabaseConfigured()
  );
}

export function isLinkedSigninEnabled(): boolean {
  return (
    env.SUPABASE_AUTH_LINKED_SIGNIN_ENABLED === "true" && isSupabaseConfigured()
  );
}

export function isStagingOnly(): boolean {
  return env.SUPABASE_AUTH_STAGING_ONLY === "true";
}

export function getRolloutHealth() {
  return {
    configured: isSupabaseConfigured(),
    newAccountEnabled: env.SUPABASE_AUTH_NEW_ACCOUNT_ENABLED === "true",
    linkedSigninEnabled: env.SUPABASE_AUTH_LINKED_SIGNIN_ENABLED === "true",
    stagingOnly: env.SUPABASE_AUTH_STAGING_ONLY === "true",
  };
}
