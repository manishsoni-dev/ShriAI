import { z } from "zod";

import { db } from "@/lib/db";

export const BetaInviteSchema = z.object({
  email: z.email(),
  inviterId: z.string().optional(),
});

export async function createBetaInvite(email: string, inviterId?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db.betaInvite.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return existing.status === "revoked"
      ? db.betaInvite.update({
          where: { id: existing.id },
          data: { status: "pending", inviterId },
        })
      : existing;
  }
  return db.betaInvite.create({
    data: {
      email: normalizedEmail,
      inviterId,
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function validateBetaInvite(email: string) {
  const invite = await db.betaInvite.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return Boolean(
    invite &&
    invite.status !== "revoked" &&
    (!invite.expiresAt || invite.expiresAt >= new Date()),
  );
}

export async function acceptBetaInvite(email: string, userId: string) {
  const invite = await db.betaInvite.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (invite?.status === "pending") {
    await db.betaInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date(), userId },
    });
  }
}

export async function revokeBetaInvite(email: string) {
  return db.betaInvite.update({
    where: { email: email.toLowerCase().trim() },
    data: { status: "revoked" },
  });
}
