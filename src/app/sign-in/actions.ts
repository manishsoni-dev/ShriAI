"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { createCredentialsUser, DuplicateEmailError } from "@/lib/auth/users";
import { checkRateLimit } from "@/lib/rate-limit";

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
      await createCredentialsUser({
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password,
      });
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DuplicateEmailError) {
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
