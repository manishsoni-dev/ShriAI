"use server";

import { signOut as authJsSignOut } from "@/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function unifiedLogout() {
  const { client } = await createServerClient();

  // To avoid leaving conflicting sessions after successful Supabase sign-in,
  // we clear both Supabase and Auth.js sessions here.
  // Recovery Path:
  // If the user's sessions get out of sync, they can invoke this unified logout
  // action to safely clear all cookies/sessions. After this, they will be
  // cleanly signed out from both systems and can log back in.

  if (client) {
    // Clear Supabase session safely without throwing on missing config
    try {
      await client.auth.signOut();
    } catch {
      // Continue to Auth.js sign-out so a provider outage cannot leave both
      // session types active after logout or conflict resolution.
    }
  }

  // Clear Auth.js session and redirect to /sign-in
  await authJsSignOut({
    redirectTo: "/sign-in",
  });
}
