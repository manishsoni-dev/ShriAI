import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/auth/users";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = "/dashboard";
  const errorRedirect = new URL("/sign-in", request.url);

  if (!code) {
    return NextResponse.redirect(errorRedirect);
  }

  const { client } = await createServerClient();
  if (!client) {
    return NextResponse.redirect(errorRedirect);
  }

  const { error: exchangeError } =
    await client.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  // Validate claims server-side using getUser() rather than getSession()
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  // Require verified email confirmation
  if (!user.email_confirmed_at) {
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  // Require a valid UUID subject
  if (!user.id || typeof user.id !== "string") {
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  const email = user.email ? normalizeEmail(user.email) : null;
  if (!email) {
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  // Upsert the user idempotently with a transaction
  try {
    await db.$transaction(async (tx) => {
      // 1. Check if the Supabase subject is already linked to a different application User
      const existingBySupabaseId = await tx.user.findUnique({
        where: { supabaseAuthUserId: user.id },
      });

      if (existingBySupabaseId) {
        // If it's linked to the wrong email, we should probably reject.
        // But if it's already linked, we don't need to provision.
        // Let's just ensure default workspace and return.
        await ensureDefaultWorkspace(existingBySupabaseId, tx);
        return;
      }

      // 2. Reject an existing legacy-account email collision without auto-linking
      const existingByEmail = await tx.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        if (existingByEmail.supabaseAuthUserId !== user.id) {
          throw new Error("Legacy email collision or cross-link detected");
        }
      }

      // 3. Provision the new user
      const name =
        user.user_metadata?.name || user.user_metadata?.full_name || "New User";

      const newUser = await tx.user.create({
        data: {
          email,
          name: name.substring(0, 100),
          passwordHash: "", // Not used for Supabase users, but required by schema maybe? Wait, passwordHash is String.
          supabaseAuthUserId: user.id,
        },
      });

      await ensureDefaultWorkspace(newUser, tx);
    });
  } catch {
    // Legacy collision, cross-link, or other DB failure
    await client.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
