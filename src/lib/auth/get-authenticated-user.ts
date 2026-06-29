import "server-only";
import { auth } from "@/auth";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { unifiedLogout } from "@/app/actions/logout";
import {
  SUPABASE_AUTH_LINK_MISSING,
  SUPABASE_AUTH_SESSION_INVALID,
} from "@/lib/supabase/health";

/**
 * Server-side authenticated-user resolver used by all protected actions.
 *
 * Behavior:
 * - Valid linked Supabase actor takes precedence.
 * - No Supabase session falls back to existing Auth.js resolution.
 * - Valid but unlinked Supabase session denies access (no fallback).
 * - Conflicting valid Supabase and Auth.js identities deny access.
 */
export async function getAuthenticatedUser() {
  const { actor: supabaseActor, reason: supabaseReason } =
    await getCurrentActor();
  const authJsSession = await auth();

  // If Supabase session is unlinked, deny access and do not fallback
  if (supabaseReason === SUPABASE_AUTH_LINK_MISSING) {
    return null;
  }

  if (supabaseReason === SUPABASE_AUTH_SESSION_INVALID) {
    await unifiedLogout();
    return null;
  }

  const authJsUser = authJsSession?.user?.email ? authJsSession.user : null;

  // Conflict detection: If both sessions exist but belong to different application users
  // (We check by email or ID. Since AuthJs uses email in session, we compare emails if possible)
  if (supabaseActor && authJsUser) {
    if (supabaseActor.email !== authJsUser.email) {
      // Different identities -> DENY and clear both
      await unifiedLogout();
      return null;
    }
  }

  if (supabaseActor) {
    return { user: supabaseActor };
  }

  // Fallback to Auth.js session only if no Supabase session exists
  if (authJsUser) {
    return { user: authJsUser };
  }

  return null;
}
