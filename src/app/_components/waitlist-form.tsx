"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitWaitlistAction,
  type WaitlistState,
} from "@/app/waitlist/actions";
import { personas } from "@/lib/personas";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-5 text-sm font-semibold text-[#170d05] shadow-[0_0_28px_rgba(245,158,11,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Joining..." : label}
    </button>
  );
}

export function WaitlistForm({
  source,
  buttonLabel = "Join early access",
  showMessage = false,
}: {
  source: string;
  buttonLabel?: string;
  showMessage?: boolean;
}) {
  const [state, formAction] = useActionState<
    WaitlistState | undefined,
    FormData
  >(submitWaitlistAction, undefined);

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-amber-200/12 bg-black/24 p-5"
    >
      <input name="source" type="hidden" value={source} />
      <label className="grid gap-2 text-sm font-medium text-amber-100/78">
        Name
        <input
          className="h-11 rounded-md border border-amber-200/14 bg-[#090604] px-3 text-base text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/15"
          name="name"
          placeholder="Your name"
          type="text"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-amber-100/78">
        Email
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-amber-200/14 bg-[#090604] px-3 text-base text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/15"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-amber-100/78">
        Primary interest
        <select
          className="h-11 rounded-md border border-amber-200/14 bg-[#090604] px-3 text-base text-amber-50 outline-none transition focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/15"
          name="interest"
        >
          <option value="early-access">Early access</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.displayName} - {persona.title}
            </option>
          ))}
        </select>
      </label>
      {showMessage ? (
        <label className="grid gap-2 text-sm font-medium text-amber-100/78">
          Message
          <textarea
            className="min-h-28 resize-none rounded-md border border-amber-200/14 bg-[#090604] px-3 py-3 text-base leading-7 text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/15"
            name="message"
            placeholder="Share what kind of guidance experience you want."
          />
        </label>
      ) : null}
      {state ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
              : "border-red-300/25 bg-red-400/10 text-red-100"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton label={buttonLabel} />
    </form>
  );
}
