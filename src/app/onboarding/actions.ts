"use server";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MICROPHONE_CONSENT_VERSION } from "@/lib/voice/consent";

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();

  const languagePreference = (formData.get("language") as string) || "auto";
  const microphoneConsent = formData.get("microphone") === "on";

  await db.user.update({
    where: { id: user.id },
    data: {
      languagePreference,
      microphoneConsentGivenAt: microphoneConsent ? new Date() : null,
      microphoneConsentVersion: microphoneConsent
        ? MICROPHONE_CONSENT_VERSION
        : null,
      onboardedAt: new Date(),
    },
  });

  redirect("/chat");
}
