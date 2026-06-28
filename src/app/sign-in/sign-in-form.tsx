"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { authenticate, type AuthState } from "@/app/sign-in/actions";

type AuthMode = "sign-in" | "register";

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-5 text-sm font-semibold text-[#170d05] shadow-[0_0_26px_rgba(245,158,11,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending
        ? mode === "register"
          ? "Creating account..."
          : "Signing in..."
        : mode === "register"
          ? "Create account"
          : "Sign in"}
    </button>
  );
}

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState<AuthState | undefined, FormData>(
    authenticate,
    undefined,
  );
  const [mode, setMode] = useState<AuthMode>(state?.mode ?? "sign-in");
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const nameErrorId = useId();
  const messageId = useId();
  const isRegistering = mode === "register";

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input name="mode" type="hidden" value={mode} />
      {callbackUrl ? (
        <input name="redirectTo" type="hidden" value={callbackUrl} />
      ) : null}

      <div
        aria-label="Account access mode"
        className="grid grid-cols-2 gap-2 rounded-md border border-amber-200/12 bg-black/25 p-1"
        role="group"
      >
        <button
          aria-pressed={mode === "sign-in"}
          className={`h-10 rounded-md text-sm font-semibold transition ${
            mode === "sign-in"
              ? "bg-amber-200 text-[#170d05]"
              : "text-amber-100/70 hover:bg-amber-200/10"
          }`}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          aria-pressed={isRegistering}
          className={`h-10 rounded-md text-sm font-semibold transition ${
            isRegistering
              ? "bg-amber-200 text-[#170d05]"
              : "text-amber-100/70 hover:bg-amber-200/10"
          }`}
          onClick={() => setMode("register")}
          type="button"
        >
          Register
        </button>
      </div>

      <p className="text-sm leading-6 text-amber-100/64">
        {isRegistering
          ? "Create a private workspace for your own guidance threads."
          : "Use the email and password for an existing Shri AI account."}
      </p>

      <label className="grid gap-2 text-sm font-medium text-amber-100/80">
        Email
        <input
          aria-describedby={
            state?.fieldErrors?.email ? emailErrorId : undefined
          }
          aria-invalid={Boolean(state?.fieldErrors?.email)}
          autoComplete="email"
          className="h-11 rounded-md border border-amber-200/20 bg-black/40 px-3 text-base text-amber-50 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
          defaultValue={state?.email}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        {state?.fieldErrors?.email ? (
          <span className="text-sm text-red-200" id={emailErrorId}>
            {state.fieldErrors.email}
          </span>
        ) : null}
      </label>

      {isRegistering ? (
        <label className="grid gap-2 text-sm font-medium text-amber-100/80">
          Name
          <input
            aria-describedby={
              state?.fieldErrors?.name ? nameErrorId : undefined
            }
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoComplete="name"
            className="h-11 rounded-md border border-amber-200/20 bg-black/40 px-3 text-base text-amber-50 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
            defaultValue={state?.name}
            maxLength={100}
            name="name"
            placeholder="Used for your personal workspace"
            type="text"
          />
          {state?.fieldErrors?.name ? (
            <span className="text-sm text-red-200" id={nameErrorId}>
              {state.fieldErrors.name}
            </span>
          ) : null}
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-amber-100/80">
        Password
        <input
          aria-describedby={
            state?.fieldErrors?.password ? passwordErrorId : undefined
          }
          aria-invalid={Boolean(state?.fieldErrors?.password)}
          autoComplete={isRegistering ? "new-password" : "current-password"}
          className="h-11 rounded-md border border-amber-200/20 bg-black/40 px-3 text-base text-amber-50 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
        {state?.fieldErrors?.password ? (
          <span className="text-sm text-red-200" id={passwordErrorId}>
            {state.fieldErrors.password}
          </span>
        ) : null}
      </label>

      {state?.message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          id={messageId}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
