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
import { PersonaSymbol } from "@/app/_components/persona-symbol";
import {
  VoiceRecorder,
  type ConversationPhase,
} from "@/app/_components/VoiceRecorder";
import { createConversationAction } from "@/app/chat/actions";
import {
  createTurnId,
  isActiveConversationPhase,
  type InteractionMode,
  type TerminalStatus,
} from "@/lib/conversation-state";
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
      type: "phase";
      phase: ConversationPhase;
      traceId: string;
      turnId: string;
    }
  | {
      type: "user-message";
      message: ChatMessage;
      traceId?: string;
      turnId?: string;
    }
  | {
      type: "assistant-delta";
      text: string;
      traceId?: string;
      turnId?: string;
    }
  | {
      type: "assistant-message";
      message: ChatMessage;
      citations?: Citation[];
      spokenAnswer?: string;
      traceId?: string;
      turnId?: string;
    }
  | {
      type: "error";
      error: string;
      traceId?: string;
      turnId?: string;
    }
  | {
      type: "done";
      status: TerminalStatus;
      traceId: string;
      turnId: string;
    };

type TTSResponse = {
  audioBase64?: string;
  mimeType?: string;
  error?: string;
};

type ActiveTurn = {
  abortController: AbortController;
  conversationId: string;
  interactionMode: InteractionMode;
  personaId: PersonaId;
  traceId: string;
  turnId: string;
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

type PersonaSelectionState = {
  byConversationId: Record<string, PersonaId>;
  draftPersonaId: PersonaId;
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
  const [personaSelection, setPersonaSelection] =
    useState<PersonaSelectionState>({
      byConversationId: {},
      draftPersonaId: initialPersonaId,
    });
  const [composerValue, setComposerValue] = useState("");
  const [localMessages, setLocalMessages] = useState(messages);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceOutput, setVoiceOutput] = useState(true); // Voice-first: enabled by default
  const [phase, setPhase] = useState<ConversationPhase>("idle");
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [pendingVoiceTraceId, setPendingVoiceTraceId] = useState<string | null>(
    null,
  );
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isCreatingConversation, startCreateConversation] = useTransition();

  const audioResponseRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTurnRef = useRef<ActiveTurn | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const pendingDeltaRef = useRef("");
  const deltaFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const selectedConversationId = selectedConversation?.id ?? null;
  const activePersonaId = selectedConversationId
    ? (personaSelection.byConversationId[selectedConversationId] ??
      selectedConversation?.personaId ??
      initialPersonaId)
    : personaSelection.draftPersonaId;
  const visibleMessages = useMemo(() => localMessages, [localMessages]);
  const activePersona = getPersona(activePersonaId);
  const activeRequest =
    phase === "retrieving" || phase === "thinking" || phase === "streaming";

  // Abort ongoing network requests if conversation or persona changes
  useEffect(() => {
    const hadActiveWork =
      Boolean(activeTurnRef.current) || isActiveConversationPhase(phase);

    activeTurnRef.current?.abortController.abort();
    abortControllerRef.current?.abort();
    activeTurnRef.current = null;
    abortControllerRef.current = null;
    pendingDeltaRef.current = "";
    if (deltaFrameRef.current !== null) {
      window.cancelAnimationFrame(deltaFrameRef.current);
      deltaFrameRef.current = null;
    }
    audioResponseRef.current?.pause();
    audioResponseRef.current = null;
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPhase(hadActiveWork ? "interrupted" : "idle");
    if (hadActiveWork) {
      window.setTimeout(() => setPhase("idle"), 0);
    }
    window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
    // phase is intentionally not a dependency; this effect is scoped to
    // conversation/persona switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, activePersonaId]);

  // Scroll handler using requestAnimationFrame
  const handleScroll = useCallback(() => {
    if (!viewportRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100;

    setIsAtBottom((prev) => {
      if (prev !== atBottom) return atBottom;
      return prev;
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  // Auto-scroll effect
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleMessages, phase, isAtBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeTurnRef.current?.abortController.abort();
      abortControllerRef.current?.abort();
      if (deltaFrameRef.current !== null) {
        window.cancelAnimationFrame(deltaFrameRef.current);
      }
      window.speechSynthesis?.cancel();
      audioResponseRef.current?.pause();
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
    };
  }, []);

  const speakBrowserRef = useRef<
    ((text: string, turnId?: string) => void) | null
  >(null);

  const isCurrentTurn = useCallback((turnId?: string) => {
    return Boolean(
      turnId &&
      activeTurnRef.current &&
      activeTurnRef.current.turnId === turnId,
    );
  }, []);

  function flushPendingDelta(streamingMessageId: string) {
    const text = pendingDeltaRef.current;
    pendingDeltaRef.current = "";
    deltaFrameRef.current = null;

    if (!text) return;

    setLocalMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === streamingMessageId
          ? {
              ...message,
              content: `${message.content}${text}`,
            }
          : message,
      ),
    );
  }

  function queueAssistantDelta(streamingMessageId: string, text: string) {
    pendingDeltaRef.current += text;

    if (deltaFrameRef.current !== null) return;

    deltaFrameRef.current = window.requestAnimationFrame(() => {
      flushPendingDelta(streamingMessageId);
    });
  }

  // ─── Browser TTS fallback ─────────────────────────────────────────────────
  function speakBrowser(text: string, turnId?: string) {
    if (turnId && !isCurrentTurn(turnId)) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      if (turnId && isCurrentTurn(turnId)) {
        activeTurnRef.current = null;
        abortControllerRef.current = null;
      }
      setPhase("idle");
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
      if (turnId && !isCurrentTurn(turnId)) return;
      activeTurnRef.current = null;
      abortControllerRef.current = null;
      setPhase("idle");
      window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
    };
    utterance.onerror = () => {
      if (turnId && !isCurrentTurn(turnId)) return;
      activeTurnRef.current = null;
      abortControllerRef.current = null;
      setPhase("idle");
      window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
    };

    const selectVoiceAndSpeak = () => {
      const voice = findBestVoice(profile);
      if (voice) utterance.voice = voice;
      if (turnId && !isCurrentTurn(turnId)) return;
      setPhase("speaking");
      window.dispatchEvent(new CustomEvent("shri-ai:tts-start"));
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
    async ({
      assistantMessageId,
      text,
      traceId,
      turnId,
    }: {
      assistantMessageId: string;
      text: string;
      traceId: string;
      turnId: string;
    }) => {
      if (!isCurrentTurn(turnId)) {
        return;
      }

      try {
        setPhase("speaking");
        setPlaybackBlocked(false);

        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assistantMessageId, traceId, turnId }),
        });

        const data = (await response
          .json()
          .catch(() => null)) as TTSResponse | null;

        if (!response.ok || !data?.audioBase64) {
          console.warn("[tts] ElevenLabs failed:", data?.error);
          speakBrowserRef.current?.(text, turnId);
          return;
        }

        if (!isCurrentTurn(turnId)) {
          return;
        }

        const url = audioBase64ToObjectUrl(
          data.audioBase64,
          data.mimeType ?? "audio/mpeg",
        );

        if (activeAudioUrlRef.current) {
          URL.revokeObjectURL(activeAudioUrlRef.current);
        }

        const audio = new Audio(url);
        audioResponseRef.current = audio;
        activeAudioUrlRef.current = url;

        audio.onplay = () => {
          window.dispatchEvent(new CustomEvent("shri-ai:tts-start"));
        };
        audio.onended = () => {
          if (!isCurrentTurn(turnId)) return;
          activeTurnRef.current = null;
          abortControllerRef.current = null;
          setPhase("idle");
          window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
          URL.revokeObjectURL(url);
          activeAudioUrlRef.current = null;
        };
        audio.onerror = () => {
          if (!isCurrentTurn(turnId)) return;
          activeTurnRef.current = null;
          abortControllerRef.current = null;
          setPhase("idle");
          window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
          URL.revokeObjectURL(url);
          activeAudioUrlRef.current = null;
        };

        try {
          await audio.play();
        } catch (err) {
          if (!isCurrentTurn(turnId)) return;
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setPlaybackBlocked(true);
            setPhase("idle");
          } else {
            setPhase("idle");
          }
        }
      } catch {
        if (!isCurrentTurn(turnId)) {
          return;
        }
        setPhase("idle");
        speakBrowserRef.current?.(text, turnId);
      }
    },
    [isCurrentTurn],
  );

  // ─── Speak orchestrator ───────────────────────────────────────────────────
  const speak = useCallback(
    ({
      assistantMessageId,
      text,
      traceId,
      turnId,
    }: {
      assistantMessageId: string;
      text: string;
      traceId: string;
      turnId: string;
    }) => {
      if (!voiceOutput) {
        if (isCurrentTurn(turnId)) {
          activeTurnRef.current = null;
          abortControllerRef.current = null;
        }
        setPhase("idle");
        return;
      }
      void playElevenLabsTTS({ assistantMessageId, text, traceId, turnId });
    },
    [isCurrentTurn, voiceOutput, playElevenLabsTTS],
  );

  // ─── Stop audio playback ──────────────────────────────────────────────────
  function stopSpeaking() {
    audioResponseRef.current?.pause();
    audioResponseRef.current = null;
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPhase("idle");
    setPlaybackBlocked(false);
    window.dispatchEvent(new CustomEvent("shri-ai:tts-end"));
  }

  function cancelActiveTurn() {
    activeTurnRef.current?.abortController.abort();
    abortControllerRef.current?.abort();
    activeTurnRef.current = null;
    abortControllerRef.current = null;
    pendingDeltaRef.current = "";
    if (deltaFrameRef.current !== null) {
      window.cancelAnimationFrame(deltaFrameRef.current);
      deltaFrameRef.current = null;
    }
    stopSpeaking();
    setPhase("interrupted");
    window.setTimeout(() => setPhase("idle"), 0);
  }

  // ─── Send message to chat pipeline ───────────────────────────────────────
  async function handleSendMessage(
    formData: FormData,
    options?: {
      traceIdOverride?: string;
      interactionMode?: InteractionMode;
    },
  ) {
    const traceIdOverride = options?.traceIdOverride;
    const interactionMode =
      options?.interactionMode ?? (voiceOutput ? "voice" : "text");
    const content = String(formData.get("message") ?? "").trim();
    const traceId =
      traceIdOverride ?? pendingVoiceTraceId ?? crypto.randomUUID();
    const turnId = createTurnId();

    if (!content || !selectedConversation || activeRequest) {
      return;
    }

    if (activeTurnRef.current) {
      cancelActiveTurn();
    } else {
      stopSpeaking();
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
    setComposerValue("");
    setTranscribedText(null);
    setPendingVoiceTraceId(null);
    setPhase("retrieving");
    setLocalMessages((currentMessages) => [
      ...currentMessages,
      optimisticMessage,
      streamingMessage,
    ]);

    const abortController = new AbortController();
    activeTurnRef.current = {
      abortController,
      conversationId: selectedConversation.id,
      interactionMode,
      personaId: activePersona.id,
      traceId,
      turnId,
    };
    abortControllerRef.current = abortController;

    let userMessagePersisted = false;

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
          turnId,
          interactionMode,
        }),
        signal: abortController.signal,
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
        if (event.turnId && event.turnId !== turnId) {
          return;
        }

        if (!isCurrentTurn(turnId)) {
          return;
        }

        if (event.type === "phase") {
          setPhase(event.phase);
          return;
        }

        if (event.type === "user-message") {
          userMessagePersisted = true;
          setLocalMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === optimisticMessage.id ? event.message : message,
            ),
          );
          return;
        }

        if (event.type === "assistant-delta") {
          setPhase("streaming");
          queueAssistantDelta(streamingMessage.id, event.text);
          return;
        }

        if (event.type === "assistant-message") {
          flushPendingDelta(streamingMessage.id);
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
          speak({
            assistantMessageId: event.message.id,
            text: event.spokenAnswer ?? event.message.content,
            traceId: event.traceId ?? traceId,
            turnId,
          });
          return;
        }

        if (event.type === "done") {
          if (event.status === "cancelled") {
            setPhase("interrupted");
            activeTurnRef.current = null;
            abortControllerRef.current = null;
            window.setTimeout(() => setPhase("idle"), 0);
            return;
          }

          if (event.status === "failed") {
            setPhase("error");
            return;
          }

          setPhase((current) => (current === "speaking" ? current : "idle"));
          if (!voiceOutput && isCurrentTurn(turnId)) {
            activeTurnRef.current = null;
            abortControllerRef.current = null;
          }
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
      if (error instanceof Error && error.name === "AbortError") {
        // Suppress deliberate abort errors from UI
        return;
      }

      setLocalMessages((currentMessages) =>
        userMessagePersisted
          ? currentMessages.filter(
              (message) => message.id !== streamingMessage.id,
            )
          : currentMessages.filter(
              (message) =>
                message.id !== optimisticMessage.id &&
                message.id !== streamingMessage.id,
            ),
      );
      if (!userMessagePersisted) {
        setComposerValue(content);
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assistant response failed. Please try again.",
      );
      setPhase("error");
    } finally {
      if (isCurrentTurn(turnId) && !abortController.signal.aborted) {
        setPhase((current) =>
          current === "error" || current === "speaking" ? current : "idle",
        );
        if (!voiceOutput) {
          activeTurnRef.current = null;
          abortControllerRef.current = null;
        }
      }
    }
  }

  // ─── Voice recorder callbacks ─────────────────────────────────────────────
  function handleTranscript(text: string, voiceTraceId?: string) {
    window.dispatchEvent(new CustomEvent("shri-ai:voice-end"));
    setTranscribedText(text);
    setComposerValue(text);
    setPendingVoiceTraceId(voiceTraceId ?? null);
    setPhase("retrieving");

    // Auto-submit if a conversation is selected
    if (selectedConversation) {
      const formData = new FormData();
      formData.append("message", text);
      void handleSendMessage(formData, {
        traceIdOverride: voiceTraceId,
        interactionMode: "voice",
      });
    }
  }

  function handlePermissionRequest() {
    setErrorMessage(null);
    setPlaybackBlocked(false);
  }

  function handleVoiceError(message: string) {
    window.dispatchEvent(new CustomEvent("shri-ai:voice-end"));
    setErrorMessage(message);
    setPhase("error");
    // Reset to idle after a moment
    window.setTimeout(() => setPhase("idle"), 4000);
  }

  function handleRecordingStart() {
    window.dispatchEvent(new CustomEvent("shri-ai:voice-start"));
    setErrorMessage(null);
    setPlaybackBlocked(false);
    if (activeTurnRef.current || activeRequest || phase === "speaking") {
      cancelActiveTurn();
    } else {
      stopSpeaking();
    }
    setPhase("listening");
  }

  // Handle transcribing state
  function handleRecordingStop() {
    window.dispatchEvent(new CustomEvent("shri-ai:voice-end"));
    if (phase === "listening") {
      setPhase("transcribing");
    }
  }

  function handlePersonaSelect(personaId: PersonaId) {
    setPersonaSelection((current) => {
      if (selectedConversationId) {
        return {
          ...current,
          byConversationId: {
            ...current.byConversationId,
            [selectedConversationId]: personaId,
          },
        };
      }

      return {
        ...current,
        draftPersonaId: personaId,
      };
    });

    if (!selectedConversationId) {
      router.replace(`/chat?persona=${personaId}`, { scroll: false });
    }
  }

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
                    onClick={() => handlePersonaSelect(persona.id)}
                    style={personaStyle(persona)}
                    type="button"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-200/14 text-amber-50">
                      <PersonaSymbol
                        className="h-6 w-6 opacity-30"
                        personaId={persona.id}
                        style={{ color: persona.color }}
                      />
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
                  if (phase === "speaking") stopSpeaking();
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

          <div className="flex flex-1 flex-col overflow-hidden relative">
            <div
              ref={viewportRef}
              className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
            >
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
                  {phase === "retrieving" || phase === "thinking" ? (
                    <div className="flex justify-start">
                      <div className="rounded-lg border border-amber-200/12 bg-[#120c08]/88 px-4 py-3 text-sm text-amber-100/64 shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
                        {phase === "retrieving"
                          ? "Consulting scripture..."
                          : `${activePersona.displayName} is reflecting...`}
                      </div>
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Jump to latest button overlay */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex w-full justify-center pb-4">
              {!isAtBottom && (
                <button
                  className="pointer-events-auto rounded-full border border-amber-200/20 bg-[#120c08]/90 px-4 py-2 text-xs font-semibold tracking-wide text-amber-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:bg-[#1a110b]"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    });
                    setIsAtBottom(true);
                  }}
                  type="button"
                >
                  ↓ Jump to latest
                </button>
              )}
            </div>

            {/* ── Composer / Voice area ── */}
            <div className="border-t border-amber-200/12 bg-[#080604]/82 p-4 backdrop-blur-xl md:p-6">
              <div className="mx-auto max-w-4xl">
                {/* Transcribed text preview */}
                {transcribedText && phase !== "idle" ? (
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
                          setPhase("speaking");
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
                    if (phase === "error") setPhase("idle");
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
                        voiceState={phase}
                      />
                    </div>

                    {/* Text fallback */}
                    <div className="flex flex-1 flex-col gap-2">
                      <textarea
                        aria-label="Type your message"
                        className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-3 text-sm leading-6 text-amber-50 outline-none placeholder:text-amber-100/38"
                        disabled={!selectedConversation || activeRequest}
                        name="message"
                        onChange={(event) =>
                          setComposerValue(event.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (
                              composerValue.trim() &&
                              !activeRequest &&
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
                        {/* Stop/cancel current turn button */}
                        {phase === "speaking" ? (
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-red-400/35 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/18"
                            onClick={stopSpeaking}
                            type="button"
                          >
                            ■ Stop
                          </button>
                        ) : activeRequest ? (
                          <button
                            className="flex items-center gap-1.5 rounded-md border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/18"
                            onClick={cancelActiveTurn}
                            type="button"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span />
                        )}

                        <button
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-semibold text-[#170d05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !selectedConversation ||
                            activeRequest ||
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
