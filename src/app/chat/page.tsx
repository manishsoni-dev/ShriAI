import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChatShell } from "@/app/chat/chat-shell";
import {
  ConversationAccessError,
  getConversation,
  listConversations,
  listMessages,
} from "@/lib/conversations";
import { db } from "@/lib/db";
import {
  getPersona,
  getPersonaFromMetadata,
  isPersonaId,
} from "@/lib/personas";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

type ChatPageProps = {
  searchParams: Promise<{
    conversationId?: string;
    persona?: string;
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
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

  const workspace = await ensureDefaultWorkspace(user);
  const conversations = await listConversations({
    userId: user.id,
    workspaceId: workspace.id,
  });
  const { conversationId, persona } = await searchParams;
  const selectedConversationId =
    conversationId ?? conversations.at(0)?.id ?? null;

  let selectedConversation: Awaited<ReturnType<typeof getConversation>> | null =
    null;
  let messages: Awaited<ReturnType<typeof listMessages>> = [];

  if (selectedConversationId) {
    try {
      selectedConversation = await getConversation({
        userId: user.id,
        conversationId: selectedConversationId,
      });
      messages = await listMessages({
        userId: user.id,
        conversationId: selectedConversation.id,
      });
    } catch (error) {
      if (error instanceof ConversationAccessError) {
        notFound();
      }

      throw error;
    }
  }

  return (
    <ChatShell
      conversations={conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title ?? "Untitled conversation",
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        preview: conversation.messages.at(0)?.content ?? null,
        personaId: getPersonaFromMetadata(conversation.metadata).id,
      }))}
      currentUser={{
        email: user.email,
        name: user.name,
      }}
      messages={messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      }))}
      selectedConversation={
        selectedConversation
          ? {
              id: selectedConversation.id,
              title: selectedConversation.title ?? "Untitled conversation",
              personaId: getPersonaFromMetadata(selectedConversation.metadata)
                .id,
            }
          : null
      }
      key={selectedConversation?.id ?? `empty-chat-${persona ?? "default"}`}
      workspace={{
        name: workspace.name,
        slug: workspace.slug,
      }}
      initialPersonaId={
        getPersona(
          selectedConversation
            ? getPersonaFromMetadata(selectedConversation.metadata).id
            : isPersonaId(persona)
              ? persona
              : undefined,
        ).id
      }
    />
  );
}
