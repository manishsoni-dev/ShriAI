import "server-only";
import { createServerClient } from "../supabase/server";
import { db } from "../db";
import {
  SUPABASE_AUTH_UNAVAILABLE,
  SUPABASE_AUTH_SESSION_INVALID,
  SUPABASE_AUTH_LINK_MISSING,
} from "../supabase/health";

function isMissingSupabaseSession(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    name === "AuthSessionMissingError" ||
    message.toLowerCase().includes("auth session missing")
  );
}

export async function getCurrentActor() {
  const { client, status } = await createServerClient();

  if (!client) {
    return { actor: null, reason: status };
  }

  // Strictly use server-side JWT validation, ignoring browser-submitted IDs
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    return {
      actor: null,
      reason: isMissingSupabaseSession(error)
        ? SUPABASE_AUTH_UNAVAILABLE
        : SUPABASE_AUTH_SESSION_INVALID,
    };
  }

  if (!user || !user.id) {
    return { actor: null, reason: SUPABASE_AUTH_UNAVAILABLE };
  }

  // Resolve ONLY the linked application User by supabaseAuthUserId
  const appUser = await db.user.findUnique({
    where: { supabaseAuthUserId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
    },
  });

  if (!appUser) {
    // Never fall back from an unlinked Supabase identity to another app user
    return { actor: null, reason: SUPABASE_AUTH_LINK_MISSING };
  }

  // Return a minimal safe actor
  return { actor: appUser, reason: null };
}
