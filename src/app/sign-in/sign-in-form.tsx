"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { authenticate } from "@/app/sign-in/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-[#2f3f3d] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing in..." : "Continue"}
    </button>
  );
}

export function SignInForm() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-[#2f3f3d]">
        Email
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-black/15 bg-white px-3 text-base text-[#171717] outline-none transition focus:border-[#08766f] focus:ring-2 focus:ring-[#08766f]/15"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#2f3f3d]">
        Name
        <input
          autoComplete="name"
          className="h-11 rounded-md border border-black/15 bg-white px-3 text-base text-[#171717] outline-none transition focus:border-[#08766f] focus:ring-2 focus:ring-[#08766f]/15"
          name="name"
          placeholder="Used when creating a new account"
          type="text"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#2f3f3d]">
        Password
        <input
          autoComplete="current-password"
          className="h-11 rounded-md border border-black/15 bg-white px-3 text-base text-[#171717] outline-none transition focus:border-[#08766f] focus:ring-2 focus:ring-[#08766f]/15"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
