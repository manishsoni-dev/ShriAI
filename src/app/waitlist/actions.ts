"use server";

import { z } from "zod";

import { db } from "@/lib/db";

const waitlistSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: z.string().trim().max(120).optional(),
  interest: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1200).optional(),
  source: z.string().trim().max(80).optional(),
});

export type WaitlistState = {
  ok: boolean;
  message: string;
};

export async function submitWaitlistAction(
  _state: WaitlistState | undefined,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    interest: formData.get("interest") || undefined,
    message: formData.get("message") || undefined,
    source: formData.get("source") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.at(0)?.message ?? "Check the form fields.",
    };
  }

  await db.waitlistLead.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      interest: parsed.data.interest || null,
      message: parsed.data.message || null,
      source: parsed.data.source || "waitlist",
    },
  });

  return {
    ok: true,
    message: "You are on the Shri AI early access list.",
  };
}
