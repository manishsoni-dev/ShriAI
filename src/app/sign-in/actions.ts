"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { env } from "@/env";
import {
  createCredentialsUser,
  DuplicateEmailError,
  InvalidCredentialsError,
  normalizeEmail,
  normalizeName,
  verifyBetaAccess,
} from "@/lib/auth/users";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isNewAccountEnabled,
  isLinkedSigninEnabled,
} from "@/lib/supabase/rollout";
import { createServerClient } from "@/lib/supabase/server";

// 5 attempts per 15-minute window per unique key (email + IP)
const SIGN_IN_LIMIT = 5;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 3;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_REDIRECT = "/dashboard";

const authModeSchema = z.enum(["sign-in", "register"]);
const authFormSchema = z.object({
  email: z.string().trim().email(),
  mode: authModeSchema,
  name: z.string().trim().max(100).optional(),
  password: z.string().min(8),
  redirectTo: z.string().optional(),
});

type AuthMode = z.infer<typeof authModeSchema>;

export type AuthState = {
  fieldErrors?: {
    email?: string;
    name?: string;
    password?: string;
  };
  message?: string;
  email?: string;
  mode?: AuthMode;
  name?: string;
};

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_REDIRECT;
  }

  try {
    const base = new URL("https://shri.local");
    const parsed = new URL(value, base);

    if (
      parsed.origin !== base.origin ||
      parsed.pathname.startsWith("//") ||
      parsed.pathname === "/sign-in"
    ) {
      return DEFAULT_REDIRECT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

async function getRequestIp() {
  try {
    const headerStore = await headers();
    return (
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export async function authenticate(
  _previousState: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const emailStr = String(formData.get("email") ?? "");
  const email = emailStr.toLowerCase().trim();
  const name = String(formData.get("name") ?? "");
  const mode = authModeSchema
    .catch("sign-in")
    .parse(String(formData.get("mode") ?? "sign-in"));
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  const parsed = authFormSchema.safeParse({
    email: emailStr,
    mode,
    name,
    password: formData.get("password"),
    redirectTo,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: fieldErrors.email?.[0],
        name: fieldErrors.name?.[0],
        password: fieldErrors.password?.[0],
      },
      message: "Please check the highlighted fields.",
      email: emailStr,
      mode,
      name,
    };
  }

  const ip = await getRequestIp();
  const isRegistering = parsed.data.mode === "register";
  const { allowed, retryAfterMs } = checkRateLimit({
    key: `${isRegistering ? "register" : "sign-in"}:${ip}:${email}`,
    limit: isRegistering ? REGISTER_LIMIT : SIGN_IN_LIMIT,
    windowMs: isRegistering ? REGISTER_WINDOW_MS : SIGN_IN_WINDOW_MS,
  });

  if (!allowed) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    return {
      message: `Too many ${isRegistering ? "registration" : "sign-in"} attempts. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`,
      email: emailStr,
      mode,
      name,
    };
  }

  try {
    if (isRegistering) {
      if (isNewAccountEnabled()) {
        await supabaseRegister({
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
        });
        return {
          message:
            "Registration received. Please check your email to confirm your account.",
          email: emailStr,
          mode,
          name,
        };
      } else {
        await createCredentialsUser({
          email: parsed.data.email,
          name: parsed.data.name,
          password: parsed.data.password,
        });
      }
    }

    if (isLinkedSigninEnabled()) {
      await supabaseSignIn({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      // If supabaseSignIn returns, it means success.
      // It will redirect at the bottom of the try/catch.
    } else {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirectTo,
      });
    }
  } catch (error) {
    if (
      error instanceof AuthError ||
      error instanceof DuplicateEmailError ||
      error instanceof InvalidCredentialsError
    ) {
      return {
        message:
          mode === "register"
            ? "Unable to create an account with those details."
            : "Unable to sign in with those credentials.",
        email: emailStr,
        mode,
        name,
      };
    }

    // Re-throw Next.js redirect (NEXT_REDIRECT) and other unexpected errors.
    throw error;
  }

  redirect(redirectTo);
}

async function supabaseRegister(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = normalizeEmail(input.email);
  await verifyBetaAccess(email);

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, supabaseAuthUserId: true },
  });

  // Check for legacy-account collision. Do not auto-link and do not create parallel usable account.
  if (existingUser && !existingUser.supabaseAuthUserId) {
    return; // Pretend success to preserve generic messages.
  }

  const { client } = await createServerClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const emailRedirectTo = `${env.NEXT_PUBLIC_SITE_URL}/api/auth/supabase/callback`;

  // Use the Supabase SSR server client for signup
  await client.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: {
        name: normalizeName(input.name),
      },
    },
  });

  // We preserve generic user-facing messages that do not reveal whether an email already exists.
  // AuthApiError with status 422 for already registered users will be ignored here.
}

async function supabaseSignIn(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);

  const { client } = await createServerClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error || !data.user) {
    throw new InvalidCredentialsError();
  }

  // After successful credential validation, resolve the authenticated subject.
  const { getCurrentActor } = await import("@/lib/auth/current-actor");
  const { actor } = await getCurrentActor();

  if (!actor) {
    // Valid but unlinked Supabase account must be denied and signed out
    await client.auth.signOut();
    throw new InvalidCredentialsError();
  }
}
