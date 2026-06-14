import {
  generateGroundedAnswer,
  validateAnswerCitations,
} from "@/lib/ai/answer-generator";

// ... existing imports ...
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { AIError } from "@/lib/ai";
import {
  ConversationAccessError,
  createMessage,
  getConversation,
  listMessages,
} from "@/lib/conversations";
import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/knowledge-search";
import { logObservabilityEvent } from "@/lib/observability";
import {
  getPersona,
  getPersonaFromMetadata,
  isPersonaId,
} from "@/lib/personas";
import { checkRateLimit, rateLimitResponseHeaders } from "@/lib/rate-limit";
import {
  formatScriptureContextForPrompt,
  retrieveScriptureContext,
  type ScriptureRetrievalResult,
} from "@/lib/rag/scripture-retrieval";
import { crisisSupportMessage, detectCrisisIntent } from "@/lib/safety/crisis";

type StreamRequest = {
  conversationId?: string;
  message?: string;
  personaId?: string;
  traceId?: string;
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

// ── Scripture retrieval (primary RAG source) ──────────────────────────────────

async function getScriptureRAGContext(input: {
  query: string;
  personaId: string;
  isDevMode: boolean;
  traceId: string;
  userId: string;
  conversationId: string;
}): Promise<ScriptureRetrievalResult | null> {
  if (!isPersonaId(input.personaId)) return null;

  try {
    return await retrieveScriptureContext({
      query: input.query,
      personaId: input.personaId,
      mode: "voice",
      limit: 6,
      debugMode: input.isDevMode,
      threshold: 0,
      traceId: input.traceId,
      userId: input.userId,
      conversationId: input.conversationId,
    });
  } catch {
    return null;
  }
}

// ── Workspace document search (secondary, user-uploaded content) ──────────────

async function getWorkspaceDocumentContext(input: {
  userId: string;
  workspaceId: string;
  query: string;
}): Promise<string | undefined> {
  try {
    const results = await semanticSearch({
      userId: input.userId,
      workspaceId: input.workspaceId,
      query: input.query,
      topK: 3,
    });

    if (results.length === 0) return undefined;

    return results
      .map(
        (result, index) =>
          `[${index + 1}] ${result.documentName}, chunk ${result.chunkIndex}: ${result.content.slice(0, 600)}`,
      )
      .join("\n\n");
  } catch {
    return undefined;
  }
}

// ── Persist citations (best-effort) ──────────────────────────────────────────

async function persistCitations(
  messageId: string,
  ragResult: ScriptureRetrievalResult,
) {
  if (ragResult.chunks.length === 0) return;

  try {
    await db.answerCitation.createMany({
      data: ragResult.chunks.map((chunk) => ({
        messageId,
        chunkId: chunk.id,
        score: chunk.score,
      })),
      skipDuplicates: true,
    });
  } catch {
    // Never crash the chat request because of citation persistence
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const startedAt = Date.now();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `chat:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many chat requests. Please slow down." },
      {
        status: 429,
        headers: rateLimitResponseHeaders(rateLimit.retryAfterMs),
      },
    );
  }

  const body = (await request.json().catch(() => null)) as StreamRequest | null;
  const conversationId = body?.conversationId;
  const content = body?.message?.trim();
  const requestedPersonaId = body?.personaId;
  const traceId = body?.traceId ?? crypto.randomUUID();

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and message are required." },
      { status: 400 },
    );
  }

  const isDevMode = process.env.NODE_ENV === "development";

  try {
    const conversation = await getConversation({
      userId: user.id,
      conversationId,
    });
    const persona = getPersona(
      isPersonaId(requestedPersonaId)
        ? requestedPersonaId
        : getPersonaFromMetadata(conversation.metadata).id,
    );

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
          metadata: {
            source: "chat",
            personaId: persona.id,
          },
        },
      });

      return message;
    });

    await listMessages({
      userId: user.id,
      conversationId: conversation.id,
      limit: 20,
    });

    if (detectCrisisIntent(content)) {
      const answer = crisisSupportMessage();
      const assistantMessage = await createMessage({
        userId: user.id,
        conversationId: conversation.id,
        role: "assistant",
        content: answer,
        metadata: {
          provider: "safety",
          model: "crisis-routing",
          grounding: "crisis-support",
          spokenAnswer: answer,
          traceId,
        },
      });

      void logObservabilityEvent({
        traceId,
        eventType: "chat",
        status: "success",
        userId: user.id,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        personaId: persona.id,
        model: "crisis-routing",
        latencyMs: Date.now() - startedAt,
        payload: {
          userQuery: content,
          safetyRoute: "crisis",
        },
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "user-message",
                message: serializeMessage(userMessage),
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-delta",
                text: answer,
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-message",
                message: serializeMessage(assistantMessage),
                spokenAnswer: answer,
                citations: [],
                traceId,
              }),
            ),
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Cache-Control": "no-cache, no-transform",
          "Content-Type": "application/x-ndjson; charset=utf-8",
        },
      });
    }

    // ── Parallel: scripture RAG + workspace document search ─────────────────
    const [ragResult, workspaceContext] = await Promise.all([
      getScriptureRAGContext({
        query: content,
        personaId: persona.id,
        isDevMode,
        traceId,
        userId: user.id,
        conversationId: conversation.id,
      }),
      getWorkspaceDocumentContext({
        userId: user.id,
        workspaceId: conversation.workspaceId,
        query: content,
      }),
    ]);

    const scriptureContext = ragResult
      ? formatScriptureContextForPrompt(ragResult)
      : "";

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            streamEvent({
              type: "user-message",
              message: serializeMessage(userMessage),
            }),
          ),
        );

        try {
          const answer = await generateGroundedAnswer({
            query: content,
            persona,
            scriptureContext,
            workspaceContext,
            insufficientContext: ragResult?.insufficientContext ?? false,
            insufficientApprovedContext:
              ragResult?.insufficientApprovedContext ?? false,
          });

          if (
            ragResult &&
            answer.citations.length > 0 &&
            !validateAnswerCitations(answer.citations, ragResult.chunks)
          ) {
            throw new Error("Generated answer contained invalid citations.");
          }

          // Enqueue the whole message immediately
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-delta",
                text: answer.displayAnswer,
              }),
            ),
          );
          const assistantMessage = await createMessage({
            userId: user.id,
            conversationId: conversation.id,
            role: "assistant",
            content: answer.displayAnswer,
            metadata: {
              provider: "openai",
              model: "gpt-4o-mini",
              grounding: answer.grounding,
              spokenAnswer: answer.spokenAnswer,
              traceId,
            },
          });

          // Persist citations (fire and forget)
          if (ragResult) {
            void persistCitations(assistantMessage.id, ragResult);
          }

          void logObservabilityEvent({
            traceId,
            eventType: "chat",
            status: "success",
            userId: user.id,
            conversationId: conversation.id,
            messageId: assistantMessage.id,
            personaId: persona.id,
            model: "gpt-4o-mini",
            latencyMs: Date.now() - startedAt,
            payload: {
              userQuery: content,
              transcript: content,
              retrievedChunks: ragResult?.chunks.map((chunk) => ({
                id: chunk.id,
                canonicalRef: chunk.canonicalRef,
                sourceTitle: chunk.sourceTitle,
                score: chunk.score,
                similarityScore: chunk.vectorScore,
                keywordRank: chunk.keywordRank,
                rerankerScore: chunk.score,
              })),
              finalCitations: ragResult?.citations ?? [],
              grounding: answer.grounding,
            },
          });

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-message",
                message: serializeMessage(assistantMessage),
                spokenAnswer: answer.spokenAnswer,
                citations: ragResult?.citations ?? [],
                traceId,
                ...(isDevMode && ragResult?.debug
                  ? { ragDebug: ragResult.debug }
                  : {}),
              }),
            ),
          );
          controller.close();
        } catch (error) {
          const message =
            error instanceof AIError
              ? `${error.code}: ${error.message}`
              : "The assistant response failed. Please try again.";

          void logObservabilityEvent({
            traceId,
            eventType: "chat",
            status: "error",
            userId: user.id,
            conversationId: conversation.id,
            personaId: persona.id,
            latencyMs: Date.now() - startedAt,
            payload: {
              userQuery: content,
              transcript: content,
              error: error instanceof Error ? error.message : String(error),
            },
          });

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "error",
                error: message,
                traceId,
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
