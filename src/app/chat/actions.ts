"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createConversation } from "@/lib/conversations";
import { db } from "@/lib/db";
import { getPersona } from "@/lib/personas";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

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
