"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser as auth } from "@/lib/auth/get-authenticated-user";
import { createConversation } from "@/lib/conversations";
import { db } from "@/lib/db";
import { getPersona } from "@/lib/personas";
import { MICROPHONE_CONSENT_VERSION } from "@/lib/voice/consent";
import { ensureDefaultWorkspace } from "@/lib/workspaces";
import { type FeedbackLabel } from "@prisma/client";

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function createConversationAction(personaId?: string) {
  const user = await getCurrentUser();
  const workspace = await ensureDefaultWorkspace(user);
  const persona = getPersona(personaId);
  const conversation = await createConversation({
    userId: user.id,
    workspaceId: workspace.id,
    title: `${persona.displayName} guidance`,
    metadata: {
      source: "chat",
      personaId: persona.id,
    },
  });

  revalidatePath("/chat");
  redirect(`/chat?conversationId=${conversation.id}`);
}

export async function updateUserPreferencesAction(languagePreference: string) {
  const user = await getCurrentUser();
  await db.user.update({
    where: { id: user.id },
    data: { languagePreference },
  });
  revalidatePath("/chat");
}

export async function giveMicrophoneConsentAction() {
  const user = await getCurrentUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      microphoneConsentGivenAt: new Date(),
      microphoneConsentVersion: MICROPHONE_CONSENT_VERSION,
    },
  });
  revalidatePath("/chat");
}

export async function submitMessageFeedbackAction({
  conversationId,
  messageId,
  labels,
  notes,
}: {
  conversationId: string;
  messageId: string;
  labels: FeedbackLabel[];
  notes?: string;
}) {
  const user = await getCurrentUser();

  // 1. Verify message ownership and cross-user denial
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  if (
    message.conversation.userId !== user.id ||
    message.conversationId !== conversationId
  ) {
    throw new Error("Unauthorized access to message.");
  }

  if (message.role !== "assistant") {
    throw new Error("Feedback can only be submitted for assistant messages.");
  }

  // 2. Fetch the latest metadata for tracing provenance
  const conversationMetadata = message.conversation.metadata as Record<
    string,
    unknown
  > | null;
  const messageMetadata = message.metadata as Record<string, unknown> | null;
  const personaId =
    typeof conversationMetadata?.personaId === "string"
      ? conversationMetadata.personaId
      : undefined;
  const traceId =
    typeof messageMetadata?.traceId === "string"
      ? messageMetadata.traceId
      : undefined;

  // 3. No raw sensitive data duplication - feedback is stored strictly against the message
  await db.userFeedback.create({
    data: {
      userId: user.id,
      conversationId: message.conversationId,
      messageId: message.id,
      personaId: personaId,
      traceId: traceId,
      labels: labels,
      notes: notes, // explicitly user-submitted, not scraped from message text
    },
  });

  revalidatePath(`/chat?conversationId=${conversationId}`);
}
