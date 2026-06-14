"use client";

import type { MessageRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";

import { CosmicOrbitEngine } from "@/app/_components/CosmicOrbitEngine";
import { BrandMark } from "@/app/_components/devotional-shell";
import {
  VoiceRecorder,
  type VoiceState,
} from "@/app/_components/VoiceRecorder";
import { createConversationAction } from "@/app/chat/actions";
import {
  getPersona,
  personas,
  type Persona,
  type PersonaId,
} from "@/lib/personas";
import {
  cleanTextForTTS,
  findBestVoice,
  truncateForTTS,
} from "@/lib/tts-utils";
import { getVoiceProfile } from "@/lib/voiceProfiles";

type ConversationItem = {
  id: string;
  title: string;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
  personaId: PersonaId;
};

type Citation = {
  ref: string;
  source: string;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  pending?: boolean;
  /** Scripture citations attached to an assistant response */
  citations?: Citation[];
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
      citations?: Citation[];
      spokenAnswer?: string;
      traceId?: string;
    }
  | {
      type: "error";
      error: string;
    };

type TTSResponse = {
  audioBase64?: string;
  mimeType?: string;
  error?: string;
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
    personaId: PersonaId;
  } | null;
  workspace: {
    name: string;
    slug: string;
  };
  initialPersonaId: PersonaId;
};

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function personaStyle(persona: Persona) {
  return {
    "--persona-color": persona.color,
    "--persona-glow": persona.glow,
  } as CSSProperties & {
    "--persona-color": string;
    "--persona-glow": string;
  };
}

function MessageBubble({
  message,
  persona,
}: {
  message: ChatMessage;
  persona: Persona;
}) {
  const isUser = message.role === "user";
  const hasCitations =
    !isUser && message.citations && message.citations.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col gap-1.5 max-w-[88%] md:max-w-[72%]`}>
        <article
          className={`divine-text-reveal rounded-lg border px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.26)] ${
            isUser
              ? "border-amber-300/30 bg-gradient-to-br from-amber-300 to-orange-500 text-[#170d05]"
              : "border-[color:var(--persona-color)]/25 bg-[#120c08]/88 text-amber-50"
          } ${message.pending ? "opacity-70" : ""}`}
          style={personaStyle(persona)}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
            {isUser ? "Seeker" : persona.displayName}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {message.content}
          </p>
        </article>
        {hasCitations && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.citations!.map((citation) => (
              <span
                key={citation.ref}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/8 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-300/80"
                title={`Source: ${citation.source}`}
              >
                <svg
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 12 12"
                >
                  <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 1.5a.75.75 0 0 1 .75.75v2.5h1.5a.75.75 0 0 1 0 1.5H6.75v1a.75.75 0 0 1-1.5 0v-1H3.75a.75.75 0 0 1 0-1.5h1.5V3.25A.75.75 0 0 1 6 2.5z" />
                </svg>
                {citation.ref}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function audioBase64ToObjectUrl(audioBase64: string, mimeType: string) {
  const binary = window.atob(audioBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function ChatShell({
  conversations,
  currentUser,
  messages,
  selectedConversation,
  workspace,
  initialPersonaId,
}: ChatShellProps) {
  const router = useRouter();
  const [activePersonaId, setActivePersonaId] =
    useState<PersonaId>(initialPersonaId);
  const [composerValue, setComposerValue] = useState("");
  const [localMessages, setLocalMessages] = useState(messages);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true); // Voice-first: enabled by default
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [pendingVoiceTraceId, setPendingVoiceTraceId] = useState<string | null>(
    null,
  );
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [isCreatingConversation, startCreateConversation] = useTransition();

  const audioResponseRef = useRef<HTMLAudioElement | null>(null);
  const pendingTtsRef = useRef<string | null>(null);

  const visibleMessages = useMemo(() => localMessages, [localMessages]);
  const activePersona = getPersona(activePersonaId);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      audioResponseRef.current?.pause();
    };
  }, []);

  const speakBrowserRef = useRef<((text: string) => void) | null>(null);

  // ─── Browser TTS fallback ─────────────────────────────────────────────────
  function speakBrowser(text: string) {
    if (!("speechSynthesis" in window)) {
      setVoiceState("idle");
      return;
    }

    window.speechSynthesis.cancel();

    const profile = getVoiceProfile(activePersonaId);
    const cleaned = cleanTextForTTS(text);
    const truncated = truncateForTTS(cleaned, profile.maxTtsChars);

    const utterance = new SpeechSynthesisUtterance(truncated);
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume;

    utterance.onstart = () => {
      window.dispatchEvent(new CustomEvent("shri-ai:tts-start"));
    };
    utterance.onend = () => {
      setVoiceState("idle");
      window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
    };
    utterance.onerror = () => {
      setVoiceState("idle");
      window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
    };

    const selectVoiceAndSpeak = () => {
      const voice = findBestVoice(profile);
      if (voice) utterance.voice = voice;
      setVoiceState("speaking");
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      selectVoiceAndSpeak();
    } else {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        selectVoiceAndSpeak,
        {
          once: true,
        },
      );
    }
  }

  // Keep ref in sync with latest speakBrowser so playElevenLabsTTS can call it
  useEffect(() => {
    speakBrowserRef.current = speakBrowser;
  });

  // ─── ElevenLabs TTS ───────────────────────────────────────────────────────
  const playElevenLabsTTS = useCallback(
    async (text: string, traceId?: string) => {
      try {
        setVoiceState("speaking");
        setPlaybackBlocked(false);

        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, personaId: activePersonaId, traceId }),
        });

        const data = (await response
          .json()
          .catch(() => null)) as TTSResponse | null;

        if (!response.ok || !data?.audioBase64) {
          console.warn("[tts] ElevenLabs failed:", data?.error);
          speakBrowserRef.current?.(text);
          return;
        }

        const url = audioBase64ToObjectUrl(
          data.audioBase64,
          data.mimeType ?? "audio/mpeg",
        );

        if (audioResponseRef.current?.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioResponseRef.current.src);
        }

        const audio = new Audio(url);
        audioResponseRef.current = audio;

        audio.onplay = () => {
          window.dispatchEvent(new CustomEvent("shri-ai:tts-start"));
        };
        audio.onended = () => {
          setVoiceState("idle");
          window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setVoiceState("idle");
          window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
          URL.revokeObjectURL(url);
        };

        try {
          await audio.play();
        } catch (err) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setPlaybackBlocked(true);
            setVoiceState("idle");
          } else {
            setVoiceState("idle");
          }
        }
      } catch {
        setVoiceState("idle");
        speakBrowserRef.current?.(text);
      }
    },
    [activePersonaId],
  );

  // ─── Speak orchestrator ───────────────────────────────────────────────────
  const speak = useCallback(
    (text: string, traceId?: string) => {
      if (!voiceOutput) {
        setVoiceState("idle");
        return;
      }
      void playElevenLabsTTS(text, traceId);
    },
    [voiceOutput, playElevenLabsTTS],
  );

  // ─── Stop audio playback ──────────────────────────────────────────────────
  function stopSpeaking() {
    audioResponseRef.current?.pause();
    window.speechSynthesis?.cancel();
    setVoiceState("idle");
    setPlaybackBlocked(false);
    window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
  }

  // ─── Send message to chat pipeline ───────────────────────────────────────
  async function handleSendMessage(
    formData: FormData,
    traceIdOverride?: string,
  ) {
    const content = String(formData.get("message") ?? "").trim();
    const traceId =
      traceIdOverride ?? pendingVoiceTraceId ?? crypto.randomUUID();

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
    setTranscribedText(null);
    setPendingVoiceTraceId(null);
    setVoiceState("thinking");
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
          personaId: activePersona.id,
          traceId,
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
          const messageWithCitations: ChatMessage = {
            ...event.message,
            citations: event.citations ?? [],
          };
          setLocalMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === streamingMessage.id
                ? messageWithCitations
                : message,
            ),
          );
          // Trigger TTS with final text
          speak(
            event.spokenAnswer ?? event.message.content,
            event.traceId ?? traceId,
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
      setVoiceState("error");
    } finally {
      setIsStreaming(false);
    }
  }

  // ─── Voice recorder callbacks ─────────────────────────────────────────────
  function handleTranscript(text: string, voiceTraceId?: string) {
    setTranscribedText(text);
    setComposerValue(text);
    setPendingVoiceTraceId(voiceTraceId ?? null);
    setVoiceState("thinking");

    // Auto-submit if a conversation is selected
    if (selectedConversation) {
      const fd = new FormData();
      fd.append("message", text);
      void handleSendMessage(fd, voiceTraceId);
    }
  }

  function handlePermissionRequest() {
    setVoiceState("requesting");
    setErrorMessage(null);
    setPlaybackBlocked(false);
  }

  function handleVoiceError(message: string) {
    setErrorMessage(message);
    setVoiceState("error");
    // Reset to idle after a moment
    window.setTimeout(() => setVoiceState("idle"), 4000);
  }

  function handleRecordingStart() {
    setVoiceState("recording");
    setErrorMessage(null);
    setPlaybackBlocked(false);
    // Stop any active playback
    stopSpeaking();
    pendingTtsRef.current = null;
    // stopSpeaking sets state to idle, but we want recording state, so override it:
    setVoiceState("recording");
  }

  // Handle transcribing state
  function handleRecordingStop() {
    if (voiceState === "recording") {
      setVoiceState("transcribing");
    }
  }

  // Determine effective voice state for the recorder
  const recorderVoiceState: VoiceState =
    voiceState === "thinking" && isStreaming ? "thinking" : voiceState;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070504] text-amber-50">
      <CosmicOrbitEngine
        centerYRatio={0.34}
        className="pointer-events-none fixed inset-0 h-full w-full"
        opacity={0.28}
        showTrails={false}
      />
      <div aria-hidden="true" className="absolute inset-0 devotional-cosmos" />
      <div aria-hidden="true" className="absolute inset-0 particle-field" />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[360px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-[88vw] max-w-[380px] flex-col border-r border-amber-200/12 bg-[#090604]/95 shadow-2xl backdrop-blur-xl transition-transform lg:static lg:w-auto lg:max-w-none lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-amber-200/12 p-5">
            <div className="flex items-start justify-between gap-4">
              <BrandMark compact />
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200/15 text-lg lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form
              action={() => {
                startCreateConversation(async () => {
                  await createConversationAction(activePersona.id);
                });
              }}
              className="mt-5"
            >
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-semibold text-[#170d05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreatingConversation}
                type="submit"
              >
                {isCreatingConversation
                  ? "Opening..."
                  : `New ${activePersona.displayName} guidance`}
              </button>
            </form>
          </div>

          <div className="border-b border-amber-200/12 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/65">
              Personas
            </p>
            <div className="mt-3 grid gap-2">
              {personas.map((persona) => {
                const isActive = activePersona.id === persona.id;

                return (
                  <button
                    className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                      isActive
                        ? "border-[color:var(--persona-color)]/45 bg-[color:var(--persona-color)]/12"
                        : "border-amber-200/8 bg-white/[0.03] hover:border-amber-200/18"
                    }`}
                    key={persona.id}
                    onClick={() => setActivePersonaId(persona.id)}
                    style={personaStyle(persona)}
                    type="button"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-200/14 text-[10px] font-semibold uppercase text-amber-50">
                      {persona.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-amber-50">
                        {persona.displayName}
                      </span>
                      <span className="block truncate text-xs text-amber-100/58">
                        {persona.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            {conversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-amber-200/18 p-4 text-sm leading-6 text-amber-100/62">
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
                          ? "border-amber-300/30 bg-amber-300/10"
                          : "border-transparent hover:border-amber-200/12 hover:bg-white/[0.04]"
                      }`}
                      href={`/chat?conversationId=${conversation.id}`}
                      key={conversation.id}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {conversation.title}
                        </p>
                        <span className="shrink-0 text-xs text-amber-100/45">
                          {formatConversationDate(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-amber-200/58">
                        {getPersona(conversation.personaId).displayName}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-amber-100/50">
                        {conversation.preview ?? "Awaiting first reflection"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="border-t border-amber-200/12 p-4">
            <p className="truncate text-sm font-medium">
              {currentUser.name ?? currentUser.email}
            </p>
            <p className="mt-1 truncate text-xs text-amber-100/50">
              {workspace.name} /{workspace.slug}
            </p>
          </div>
        </aside>

        {isSidebarOpen ? (
          <button
            aria-label="Close conversations"
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <section className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-amber-200/12 bg-[#080604]/82 px-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-amber-200/14 bg-white/[0.04] px-3 text-sm font-medium lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
                type="button"
              >
                Chats
              </button>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: activePersona.color }}
                >
                  {activePersona.displayName} / {activePersona.title}
                </p>
                <h2 className="truncate font-serif text-xl font-semibold tracking-tight">
                  {selectedConversation?.title ?? "No conversation selected"}
                </h2>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {/* Voice toggle — controls whether TTS plays after responses */}
              <button
                aria-label={
                  voiceOutput
                    ? "Disable voice responses"
                    : "Enable voice responses"
                }
                aria-pressed={voiceOutput}
                className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                  voiceOutput
                    ? "border-amber-300/40 bg-amber-300/12 text-amber-100"
                    : "border-amber-200/12 bg-white/[0.04] text-amber-100/70"
                }`}
                onClick={() => {
                  setVoiceOutput((current) => !current);
                  if (voiceState === "speaking") stopSpeaking();
                }}
                type="button"
              >
                Voice
              </button>
              <Link
                className="h-10 items-center justify-center rounded-md border border-amber-200/12 bg-white/[0.04] px-4 text-sm font-medium transition hover:bg-amber-100/8 sm:inline-flex"
                href="/dashboard"
              >
                Dashboard
              </Link>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              {!selectedConversation ? (
                <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/70">
                    {activePersona.displayName} is ready
                  </p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight">
                    Open a sacred guidance thread.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-amber-100/64">
                    {activePersona.greeting}
                  </p>
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/70">
                    New conversation
                  </p>
                  <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight">
                    {activePersona.greeting}
                  </h2>
                  <div className="mt-6 grid gap-2 text-left">
                    {activePersona.suggestedPrompts.map((prompt) => (
                      <button
                        className="rounded-md border border-amber-200/12 bg-black/22 px-4 py-3 text-sm leading-6 text-amber-100/72 transition hover:border-amber-200/28 hover:bg-amber-100/8"
                        key={prompt}
                        onClick={() => setComposerValue(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl gap-4">
                  {visibleMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      persona={activePersona}
                    />
                  ))}
                  {isStreaming ? (
                    <div className="flex justify-start">
                      <div className="rounded-lg border border-amber-200/12 bg-[#120c08]/88 px-4 py-3 text-sm text-amber-100/64 shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
                        {activePersona.displayName} is reflecting...
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Composer / Voice area ── */}
            <div className="border-t border-amber-200/12 bg-[#080604]/82 p-4 backdrop-blur-xl md:p-6">
              <div className="mx-auto max-w-4xl">
                {/* Transcribed text preview */}
                {transcribedText && voiceState !== "idle" ? (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200/15 bg-amber-300/6 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                      You said
                    </span>
                    <p className="flex-1 truncate text-sm text-amber-50/80">
                      {transcribedText}
                    </p>
                  </div>
                ) : null}

                {/* Tap-to-play fallback */}
                {playbackBlocked ? (
                  <div className="mb-3 flex items-center gap-3 rounded-md border border-amber-300/25 bg-amber-300/8 px-3 py-2">
                    <p className="flex-1 text-xs text-amber-200/80">
                      Browser blocked auto-play.
                    </p>
                    <button
                      className="shrink-0 rounded-md border border-amber-300/40 bg-amber-300/12 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
                      onClick={() => {
                        setPlaybackBlocked(false);
                        if (audioResponseRef.current) {
                          void audioResponseRef.current.play();
                          setVoiceState("speaking");
                        }
                      }}
                      type="button"
                    >
                      ▶ Tap to play response
                    </button>
                  </div>
                ) : null}

                {errorMessage ? (
                  <p
                    className="mb-3 rounded-md border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                {/* Main composer row */}
                <form
                  action={handleSendMessage}
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    // Also reset voice state when submitting via text
                    if (voiceState === "error") setVoiceState("idle");
                    void e;
                  }}
                >
                  <div className="flex items-end gap-3 rounded-lg border border-amber-200/14 bg-[#110b08]/92 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.32)]">
                    {/* Voice Recorder (primary input) */}
                    <div className="flex shrink-0 flex-col items-center">
                      <VoiceRecorder
                        disabled={!selectedConversation}
                        idleLabel={
                          selectedConversation && visibleMessages.length > 0
                            ? "Tap to ask again"
                            : undefined
                        }
                        onError={handleVoiceError}
                        onPermissionRequest={handlePermissionRequest}
                        onRecordingStart={handleRecordingStart}
                        onTranscribing={handleRecordingStop}
                        onInterruptSpeaking={stopSpeaking}
                        onTranscript={handleTranscript}
                        personaDisplayName={activePersona.displayName}
                        voiceState={recorderVoiceState}
                      />
                    </div>

                    {/* Text fallback */}
                    <div className="flex flex-1 flex-col gap-2">
                      <textarea
                        aria-label="Type your message"
                        className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-3 text-sm leading-6 text-amber-50 outline-none placeholder:text-amber-100/38"
                        disabled={!selectedConversation || isStreaming}
                        name="message"
                        onChange={(event) =>
                          setComposerValue(event.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (
                              composerValue.trim() &&
                              !isStreaming &&
                              selectedConversation
                            ) {
                              e.currentTarget.form?.requestSubmit();
                            }
                          }
                        }}
                        placeholder={
                          selectedConversation
                            ? `Or type to ${activePersona.displayName}...`
                            : "Create a conversation to start chatting"
                        }
                        rows={1}
                        value={composerValue}
                      />
                      <div className="flex items-center justify-between gap-2">
                        {/* Stop speaking button */}
                        {voiceState === "speaking" ? (
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-red-400/35 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/18"
                            onClick={stopSpeaking}
                            type="button"
                          >
                            ■ Stop
                          </button>
                        ) : (
                          <span />
                        )}

                        <button
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-semibold text-[#170d05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
