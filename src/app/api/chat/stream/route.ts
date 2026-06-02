import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { aiProvider, AIError } from "@/lib/ai";
import {
  ConversationAccessError,
  createMessage,
  getConversation,
  listMessages,
} from "@/lib/conversations";
import { db } from "@/lib/db";

type StreamRequest = {
  conversationId?: string;
  message?: string;
};

function streamEvent(event: unknown) {
  return `${JSON.stringify(event)}\n`;
}

function serializeMessage(message: {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StreamRequest | null;
  const conversationId = body?.conversationId;
  const content = body?.message?.trim();

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and message are required." },
      { status: 400 },
    );
  }

  try {
    const conversation = await getConversation({
      userId: user.id,
      conversationId,
    });

    const userMessage = await db.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          role: "user",
          content,
          conversationId: conversation.id,
        },
      });

      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          title:
            conversation.title === "New conversation" || !conversation.title
              ? content.slice(0, 80)
              : conversation.title,
        },
      });

      return message;
    });

    const history = await listMessages({
      userId: user.id,
      conversationId: conversation.id,
      limit: 20,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantContent = "";
        let metadata:
          | {
              provider: string;
              model: string;
              requestId?: string;
              usage?: unknown;
            }
          | undefined;

        controller.enqueue(
          encoder.encode(
            streamEvent({
              type: "user-message",
              message: serializeMessage(userMessage),
            }),
          ),
        );

        try {
          for await (const event of aiProvider.streamChat({
            messages: [
              {
                role: "system",
                content:
                  "You are Shri AI, a concise and helpful assistant for a shared workspace. Answer clearly and keep momentum.",
              },
              ...history.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            ],
            metadata: {
              conversationId: conversation.id,
            },
            usageContext: {
              userId: user.id,
              workspaceId: conversation.workspaceId,
              conversationId: conversation.id,
            },
          })) {
            if (event.type === "text-delta") {
              assistantContent += event.text;
              controller.enqueue(
                encoder.encode(
                  streamEvent({
                    type: "assistant-delta",
                    text: event.text,
                  }),
                ),
              );
            }

            if (event.type === "done") {
              metadata = event.metadata;
            }
          }

          const assistantMessage = await createMessage({
            userId: user.id,
            conversationId: conversation.id,
            role: "assistant",
            content: assistantContent,
            metadata: {
              provider: metadata?.provider ?? "unknown",
              model: metadata?.model ?? "unknown",
              requestId: metadata?.requestId ?? null,
              usage: metadata?.usage ?? null,
            },
          });

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-message",
                message: serializeMessage(assistantMessage),
              }),
            ),
          );
          controller.close();
        } catch (error) {
          const message =
            error instanceof AIError
              ? `${error.code}: ${error.message}`
              : "The assistant response failed. Please try again.";

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "error",
                error: message,
              }),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof ConversationAccessError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    throw error;
  }
}
