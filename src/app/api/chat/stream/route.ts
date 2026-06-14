import {
  streamGroundedAnswer,
  validateAnswerCitations,
  type GroundedAnswer,
} from "@/lib/ai/answer-generator";
import { type AIMessage } from "@/lib/ai/types";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { AIError } from "@/lib/ai";
import {
  ConversationAccessError,
  createMessage,
  getConversation,
  listMessages,
} from "@/lib/conversations";
import {
  createTurnId,
  normalizeInteractionMode,
  type ConversationPhase,
  type TerminalStatus,
} from "@/lib/conversation-state";
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
  interactionMode?: string;
  message?: string;
  personaId?: string;
  source?: "text" | "voice";
  traceId?: string;
  turnId?: string;
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

function phaseEvent(input: {
  phase: ConversationPhase;
  traceId: string;
  turnId: string;
}) {
  return {
    type: "phase",
    phase: input.phase,
    traceId: input.traceId,
    turnId: input.turnId,
  };
}

function doneEvent(input: {
  status: TerminalStatus;
  traceId: string;
  turnId: string;
}) {
  return {
    type: "done",
    status: input.status,
    traceId: input.traceId,
    turnId: input.turnId,
  };
}

function safePreview(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 160);
}

const HISTORY_MAX_MESSAGES = 12;
const HISTORY_MAX_CHARS = 8000;

function buildBoundedHistory(
  messages: Array<{
    content: string;
    role: "user" | "assistant" | "system" | "tool";
  }>,
): AIMessage[] {
  const history: AIMessage[] = [];
  let totalChars = 0;

  for (const message of messages.toReversed()) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const content = message.content.trim();
    if (!content) continue;

    const nextTotal = totalChars + content.length;
    if (
      history.length >= HISTORY_MAX_MESSAGES ||
      nextTotal > HISTORY_MAX_CHARS
    ) {
      break;
    }

    history.unshift({
      role: message.role,
      content,
    });
    totalChars = nextTotal;
  }

  return history;
}

// ── Scripture retrieval (primary RAG source) ──────────────────────────────────

async function getScriptureRAGContext(input: {
  query: string;
  personaId: string;
  isDevMode: boolean;
  traceId: string;
  userId: string;
  conversationId: string;
  source: "text" | "voice";
}): Promise<ScriptureRetrievalResult | null> {
  if (!isPersonaId(input.personaId)) return null;

  try {
    return await retrieveScriptureContext({
      query: input.query,
      personaId: input.personaId,
      mode: input.source,
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
  answerCitations: GroundedAnswer["citations"],
  ragResult: ScriptureRetrievalResult,
) {
  if (answerCitations.length === 0 || ragResult.chunks.length === 0) return;

  const byRef = new Map(
    ragResult.chunks.map((chunk) => [
      `${chunk.sourceTitle}::${chunk.canonicalRef}`,
      chunk,
    ]),
  );
  const byId = new Map(ragResult.chunks.map((chunk) => [chunk.id, chunk]));

  const dataToInsert: { messageId: string; chunkId: string; score: number }[] =
    [];

  for (const citation of answerCitations) {
    let chunk = null;
    if (citation.chunkId) {
      chunk = byId.get(citation.chunkId);
    } else {
      chunk = byRef.get(`${citation.source}::${citation.canonicalRef}`);
    }

    if (chunk) {
      dataToInsert.push({
        messageId,
        chunkId: chunk.id,
        score: chunk.score,
      });
    }
  }

  if (dataToInsert.length === 0) return;

  try {
    await db.answerCitation.createMany({
      data: dataToInsert,
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
  const turnId =
    typeof body?.turnId === "string" && body.turnId.trim()
      ? body.turnId.trim()
      : createTurnId();
  const interactionMode = normalizeInteractionMode({
    interactionMode: body?.interactionMode,
    legacySource: body?.source,
  });

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and message are required." },
      { status: 400 },
    );
  }

  if (!interactionMode) {
    return NextResponse.json(
      { error: "interactionMode must be text or voice." },
      { status: 400 },
    );
  }

  const isDevMode = process.env.NODE_ENV === "development";

  try {
    const conversation = await getConversation({
      userId: user.id,
      conversationId,
    });

    const previousMessages = await listMessages({
      userId: user.id,
      conversationId: conversation.id,
      limit: 20,
    });
    const history = buildBoundedHistory(previousMessages);

    // Duplicate send prevention
    if (previousMessages.length > 0) {
      const lastMessage = previousMessages[previousMessages.length - 1];
      if (
        lastMessage.role === "user" &&
        lastMessage.content === content &&
        Date.now() - lastMessage.createdAt.getTime() < 5000
      ) {
        return NextResponse.json(
          { error: "Duplicate request" },
          { status: 409 },
        );
      }
    }

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
          interactionMode,
          personaId: persona.id,
          spokenAnswer: answer,
          traceId,
          turnId,
          voiceEligible: interactionMode === "voice",
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
          contentPreview: safePreview(content),
          contentLength: content.length,
          interactionMode,
          safetyRoute: "crisis",
          status: "completed",
          turnId,
        },
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              streamEvent(phaseEvent({ phase: "streaming", traceId, turnId })),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "user-message",
                message: serializeMessage(userMessage),
                traceId,
                turnId,
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-delta",
                text: answer,
                traceId,
                turnId,
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
                turnId,
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent(doneEvent({ status: "completed", traceId, turnId })),
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
        source: interactionMode,
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
    const abortSignal = request.signal;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            streamEvent({
              type: "user-message",
              message: serializeMessage(userMessage),
              traceId,
              turnId,
            }),
          ),
        );
        controller.enqueue(
          encoder.encode(
            streamEvent(phaseEvent({ phase: "retrieving", traceId, turnId })),
          ),
        );

        try {
          controller.enqueue(
            encoder.encode(
              streamEvent(phaseEvent({ phase: "thinking", traceId, turnId })),
            ),
          );
          const streamGen = streamGroundedAnswer({
            query: content,
            persona,
            scriptureContext,
            workspaceContext,
            insufficientContext: ragResult?.insufficientContext ?? false,
            insufficientApprovedContext:
              ragResult?.insufficientApprovedContext ?? false,
            history,
            usageContext: {
              userId: user.id,
              workspaceId: conversation.workspaceId,
              conversationId: conversation.id,
            },
            signal: abortSignal,
          });

          let firstTokenLatencyMs: number | null = null;
          let finalAnswer: GroundedAnswer | null = null;

          for await (const event of streamGen) {
            if (abortSignal.aborted) {
              break;
            }

            if (event.type === "delta") {
              if (firstTokenLatencyMs === null) {
                firstTokenLatencyMs = Date.now() - startedAt;
                controller.enqueue(
                  encoder.encode(
                    streamEvent(
                      phaseEvent({ phase: "streaming", traceId, turnId }),
                    ),
                  ),
                );
              }

              controller.enqueue(
                encoder.encode(
                  streamEvent({
                    type: "assistant-delta",
                    text: event.text,
                    traceId,
                    turnId,
                  }),
                ),
              );
            } else if (event.type === "done") {
              finalAnswer = event.answer;
            }
          }

          if (abortSignal.aborted) {
            controller.enqueue(
              encoder.encode(
                streamEvent(
                  doneEvent({ status: "cancelled", traceId, turnId }),
                ),
              ),
            );
            controller.close();
            return;
          }

          if (!finalAnswer) {
            throw new Error("Stream closed without final answer metadata.");
          }

          if (
            ragResult &&
            finalAnswer.citations.length > 0 &&
            !validateAnswerCitations(finalAnswer.citations, ragResult.chunks)
          ) {
            throw new Error("Generated answer contained invalid citations.");
          }

          const assistantMessage = await createMessage({
            userId: user.id,
            conversationId: conversation.id,
            role: "assistant",
            content: finalAnswer.displayAnswer,
            metadata: {
              provider: finalAnswer.metadata?.provider ?? "ai-gateway",
              model: finalAnswer.metadata?.model ?? "configured-chat-model",
              grounding: finalAnswer.grounding,
              interactionMode,
              personaId: persona.id,
              retrievalMode: ragResult?.mode ?? interactionMode,
              spokenAnswer: finalAnswer.spokenAnswer,
              status: "completed",
              traceId,
              turnId,
              voiceEligible: interactionMode === "voice",
            },
          });

          // Persist only citations actually used
          if (ragResult) {
            void persistCitations(
              assistantMessage.id,
              finalAnswer.citations,
              ragResult,
            );
          }

          void logObservabilityEvent({
            traceId,
            eventType: "chat",
            status: "success",
            userId: user.id,
            conversationId: conversation.id,
            messageId: assistantMessage.id,
            personaId: persona.id,
            model: finalAnswer.metadata?.model,
            latencyMs: Date.now() - startedAt,
            payload: {
              contentLength: content.length,
              contentPreview: safePreview(content),
              firstTokenLatencyMs,
              finalStatus: "completed",
              historyMessages: history.length,
              interactionMode,
              retrievedChunks: ragResult?.chunks.map((chunk) => ({
                id: chunk.id,
                canonicalRef: chunk.canonicalRef,
                sourceTitle: chunk.sourceTitle,
                score: chunk.score,
                similarityScore: chunk.vectorScore,
                keywordRank: chunk.keywordRank,
                rerankerScore: chunk.score,
              })),
              finalCitations: finalAnswer.citations,
              grounding: finalAnswer.grounding,
              provider: finalAnswer.metadata?.provider,
              requestId: finalAnswer.metadata?.requestId,
              tokenUsage: finalAnswer.metadata?.usage,
              retrievedChunkCount: ragResult?.chunks.length ?? 0,
              turnId,
            },
          });

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "assistant-message",
                message: serializeMessage(assistantMessage),
                spokenAnswer: finalAnswer.spokenAnswer,
                citations: finalAnswer.citations,
                traceId,
                turnId,
                ...(isDevMode && ragResult?.debug
                  ? { ragDebug: ragResult.debug }
                  : {}),
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent(doneEvent({ status: "completed", traceId, turnId })),
            ),
          );
          controller.close();
        } catch (error) {
          if (abortSignal.aborted) {
            controller.enqueue(
              encoder.encode(
                streamEvent(
                  doneEvent({ status: "cancelled", traceId, turnId }),
                ),
              ),
            );
            controller.close();
            return;
          }

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
              contentLength: content.length,
              contentPreview: safePreview(content),
              error: error instanceof Error ? error.message : String(error),
              finalStatus: "failed",
              interactionMode,
              turnId,
            },
          });

          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: "error",
                error: message,
                traceId,
                turnId,
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              streamEvent(doneEvent({ status: "failed", traceId, turnId })),
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
