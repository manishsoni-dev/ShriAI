"use client";

import type { MessageRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createConversationAction } from "@/app/chat/actions";

type ConversationItem = {
  id: string;
  title: string;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  pending?: boolean;
};

type StreamEvent =
  | {
      type: "user-message";
      message: ChatMessage;
    }
  | {
      type: "assistant-delta";
      text: string;
    }
  | {
      type: "assistant-message";
      message: ChatMessage;
    }
  | {
      type: "error";
      error: string;
    };

type ChatShellProps = {
  conversations: ConversationItem[];
  currentUser: {
    email: string;
    name: string | null;
  };
  messages: ChatMessage[];
  selectedConversation: {
    id: string;
    title: string;
  } | null;
  workspace: {
    name: string;
    slug: string;
  };
};

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[88%] rounded-md border px-4 py-3 shadow-sm md:max-w-[72%] ${
          isUser
            ? "border-[#0f766e]/20 bg-[#0f766e] text-white"
            : "border-black/10 bg-white text-[#171717]"
        } ${message.pending ? "opacity-70" : ""}`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
          {message.role}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </p>
      </article>
    </div>
  );
}

export function ChatShell({
  conversations,
  currentUser,
  messages,
  selectedConversation,
  workspace,
}: ChatShellProps) {
  const router = useRouter();
  const [composerValue, setComposerValue] = useState("");
  const [localMessages, setLocalMessages] = useState(messages);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreatingConversation, startCreateConversation] = useTransition();

  const visibleMessages = useMemo(() => localMessages, [localMessages]);

  async function handleSendMessage(formData: FormData) {
    const content = String(formData.get("message") ?? "").trim();

    if (!content || !selectedConversation || isStreaming) {
      return;
    }

    const pendingId = Date.now();
    const optimisticMessage: ChatMessage = {
      id: `pending-user-${pendingId}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    const streamingMessage: ChatMessage = {
      id: `pending-assistant-${pendingId}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setErrorMessage(null);
    setIsStreaming(true);
    setComposerValue("");
    setLocalMessages((currentMessages) => [
      ...currentMessages,
      optimisticMessage,
      streamingMessage,
    ]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: content,
        }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(data?.error ?? "The assistant response failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bufferedText = "";

      function applyStreamEvent(event: StreamEvent) {
        if (event.type === "user-message") {
          setLocalMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === optimisticMessage.id ? event.message : message,
            ),
          );
          return;
        }

        if (event.type === "assistant-delta") {
          setLocalMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === streamingMessage.id
                ? {
                    ...message,
                    content: `${message.content}${event.text}`,
                  }
                : message,
            ),
          );
          return;
        }

        if (event.type === "assistant-message") {
          setLocalMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === streamingMessage.id ? event.message : message,
            ),
          );
          return;
        }

        throw new Error(event.error);
      }

      function flushLines() {
        const lines = bufferedText.split("\n");
        bufferedText = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          applyStreamEvent(JSON.parse(line) as StreamEvent);
        }
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        bufferedText += decoder.decode(value, {
          stream: true,
        });
        flushLines();
      }

      bufferedText += decoder.decode();
      flushLines();
      router.refresh();
    } catch (error) {
      setLocalMessages((currentMessages) =>
        currentMessages.filter(
          (message) =>
            message.id !== optimisticMessage.id &&
            message.id !== streamingMessage.id,
        ),
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assistant response failed. Please try again.",
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#171717]">
      <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-[86vw] max-w-[340px] flex-col border-r border-black/10 bg-white transition-transform lg:static lg:w-auto lg:max-w-none lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-black/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
                  Shri AI
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">
                  Chat
                </h1>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-lg lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form
              action={() => {
                startCreateConversation(async () => {
                  await createConversationAction();
                });
              }}
              className="mt-5"
            >
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2f3f3d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreatingConversation}
                type="submit"
              >
                {isCreatingConversation ? "Creating..." : "New conversation"}
              </button>
            </form>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            {conversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-black/15 p-4 text-sm leading-6 text-[#43514f]">
                No conversations yet. Start one when you are ready.
              </div>
            ) : (
              <div className="grid gap-2">
                {conversations.map((conversation) => {
                  const isActive = selectedConversation?.id === conversation.id;

                  return (
                    <Link
                      className={`rounded-md border p-3 transition ${
                        isActive
                          ? "border-[#0f766e]/30 bg-[#eef7f5]"
                          : "border-transparent hover:border-black/10 hover:bg-[#f5f7f6]"
                      }`}
                      href={`/chat?conversationId=${conversation.id}`}
                      key={conversation.id}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {conversation.title}
                        </p>
                        <span className="shrink-0 text-xs text-[#687572]">
                          {formatConversationDate(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#43514f]">
                        {conversation.preview ?? "Empty conversation"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="border-t border-black/10 p-4">
            <p className="truncate text-sm font-medium">
              {currentUser.name ?? currentUser.email}
            </p>
            <p className="mt-1 truncate text-xs text-[#43514f]">
              {workspace.name} /{workspace.slug}
            </p>
          </div>
        </aside>

        {isSidebarOpen ? (
          <button
            aria-label="Close conversations"
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <section className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-black/10 bg-[#f5f7f6]/95 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-3 text-sm font-medium lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
                type="button"
              >
                Chats
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#08766f]">
                  {workspace.name}
                </p>
                <h2 className="truncate text-lg font-semibold tracking-tight">
                  {selectedConversation?.title ?? "No conversation selected"}
                </h2>
              </div>
            </div>
            <Link
              className="hidden h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition hover:bg-[#eef3f1] sm:inline-flex"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              {!selectedConversation ? (
                <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
                    Empty workspace
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                    Create your first conversation.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#43514f]">
                    Conversations and messages will be stored in Postgres and
                    restored whenever you come back.
                  </p>
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
                    New conversation
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                    What should Shri AI help with?
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#43514f]">
                    Send a message to start the thread. Your message appears
                    immediately and persists to the database.
                  </p>
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl gap-4">
                  {visibleMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isStreaming ? (
                    <div className="flex justify-start">
                      <div className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-[#43514f] shadow-sm">
                        Shri AI is thinking...
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-black/10 bg-[#f5f7f6] p-4 md:p-6">
              <form
                action={handleSendMessage}
                className="mx-auto flex max-w-4xl flex-col gap-3"
              >
                {errorMessage ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="flex items-end gap-3 rounded-md border border-black/10 bg-white p-2 shadow-sm shadow-[#0f766e]/5">
                  <textarea
                    className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 outline-none placeholder:text-[#8a9692]"
                    disabled={!selectedConversation || isStreaming}
                    name="message"
                    onChange={(event) => setComposerValue(event.target.value)}
                    placeholder={
                      selectedConversation
                        ? "Message Shri AI..."
                        : "Create a conversation to start chatting"
                    }
                    rows={1}
                    value={composerValue}
                  />
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2f3f3d] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      !selectedConversation ||
                      isStreaming ||
                      composerValue.trim().length === 0
                    }
                    type="submit"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
