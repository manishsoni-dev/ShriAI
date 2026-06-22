"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConversationPhase } from "@/lib/conversation-state";

export type { ConversationPhase } from "@/lib/conversation-state";

type Props = {
  personaDisplayName: string;
  disabled?: boolean;
  hasStoredConsent: boolean;
  idleLabel?: string;
  language?: "en" | "hi";
  voiceState: ConversationPhase;
  onTranscript: (text: string, voiceTraceId?: string) => void;
  onError: (message: string) => void;
  onPermissionRequest?: () => void;
  onConsentMissing?: () => void;
  onRecordingStart?: () => void;
  onTranscribing?: () => void;
  onInterruptSpeaking?: () => void;
};

const STATUS_LABELS: Record<ConversationPhase, string> = {
  idle: "Tap the mic and speak your question",
  listening: "Listening...",
  transcribing: "Transcribing your words...",
  retrieving: "Consulting scripture...",
  thinking: "Seeking divine guidance...",
  streaming: "Receiving guidance...",
  speaking: "Speaking response...",
  interrupted: "Interrupted",
  error: "Something went wrong",
};

/** Ordered MIME types to try — most browsers support webm, Safari prefers mp4. */
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
];

function getSupportedMimeType(): string {
  if (typeof window === "undefined") return "audio/webm";
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // Let browser pick
}

export function VoiceRecorder({
  personaDisplayName,
  disabled = false,
  hasStoredConsent,
  idleLabel,
  language = "en",
  voiceState,
  onTranscript,
  onError,
  onPermissionRequest,
  onConsentMissing,
  onRecordingStart,
  onTranscribing,
  onInterruptSpeaking,
}: Props) {
  const [permissionState, setPermissionState] = useState<
    "unknown" | "granted" | "denied" | "unsupported"
  >("unknown");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const isRecording = voiceState === "listening";
  const isInterruptingPlayback =
    voiceState === "speaking" || voiceState === "streaming";
  const isBusy =
    voiceState === "transcribing" ||
    voiceState === "retrieving" ||
    voiceState === "thinking";

  // Check if MediaRecorder is available
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      const timer = window.setTimeout(
        () => setPermissionState("unsupported"),
        0,
      );
      return () => window.clearTimeout(timer);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordingTimerRef.current !== null) {
        window.clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    return new Promise<void>((resolve) => {
      if (recordingTimerRef.current !== null) {
        window.clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recorder.onstop = async () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        // Stop microphone stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunks.length === 0) {
          onError("No audio was captured. Please try again.");
          resolve();
          return;
        }

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: mimeType });

        if (blob.size < 1000) {
          onError(
            "Recording was too short. Please speak clearly and try again.",
          );
          resolve();
          return;
        }

        try {
          onTranscribing?.();
          const formData = new FormData();
          formData.append(
            "audio",
            blob,
            `recording.${mimeType.split("/")[1]?.split(";")[0] ?? "webm"}`,
          );
          formData.append("language", language);

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json()) as {
            text?: string;
            error?: string;
            voiceTraceId?: string;
          };

          if (!response.ok || !data.text) {
            onError(data.error ?? "Transcription failed. Please try again.");
          } else {
            onTranscript(data.text, data.voiceTraceId);
          }
        } catch {
          onError(
            "Network error during transcription. Please check your connection.",
          );
        }

        resolve();
      };

      recorder.stop();
    });
  }, [language, onTranscript, onError, onTranscribing]);

  async function startRecording() {
    if (!hasStoredConsent) {
      onConsentMissing?.();
      onError(
        "Microphone processing consent is required before recording. Enable it below or type your question.",
      );
      return;
    }
    if (permissionState === "unsupported") {
      onError(
        "Voice recording is not supported in this browser. Please type your question.",
      );
      return;
    }

    try {
      onPermissionRequest?.();
      setPermissionState("unknown");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setPermissionState("granted");
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect chunks every 250ms
      recordingTimerRef.current = window.setTimeout(() => {
        onError(
          "Recording reached the 90-second limit and is being transcribed.",
        );
        void stopRecordingAndTranscribe();
      }, 90_000);
      onRecordingStart?.();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
      ) {
        setPermissionState("denied");
        onError(
          "Microphone access was denied. Please allow microphone access in your browser settings and try again.",
        );
      } else if (
        error instanceof DOMException &&
        error.name === "NotFoundError"
      ) {
        onError(
          "No microphone found. Please connect a microphone and try again.",
        );
      } else {
        onError("Could not access microphone. Please try again.");
      }
    }
  }

  async function handleMicClick() {
    if (disabled || isBusy) return;

    if (isRecording) {
      await stopRecordingAndTranscribe();
    } else {
      if (isInterruptingPlayback) {
        onInterruptSpeaking?.();
      }
      await startRecording();
    }
  }

  const statusLabel =
    voiceState === "thinking"
      ? `Seeking guidance from ${personaDisplayName}...`
      : voiceState === "idle" && idleLabel
        ? idleLabel
        : STATUS_LABELS[voiceState];

  const isUnsupported = permissionState === "unsupported";
  const isDenied = permissionState === "denied";
  const isConsentMissing = !hasStoredConsent;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Status label */}
      <p
        aria-live="polite"
        className={`text-center text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-300 ${
          voiceState === "error"
            ? "text-red-400"
            : voiceState === "speaking"
              ? "text-amber-300"
              : voiceState === "listening"
                ? "text-green-400"
                : "text-amber-200/60"
        }`}
      >
        {statusLabel}
      </p>

      {/* Mic button */}
      <button
        aria-label={
          isRecording
            ? "Stop recording"
            : isInterruptingPlayback
              ? "Interrupt response and start voice recording"
              : "Start voice recording"
        }
        aria-pressed={isRecording}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
          isUnsupported || isDenied || isConsentMissing || disabled
            ? "cursor-not-allowed border-amber-200/15 bg-white/[0.04] opacity-45"
            : isRecording
              ? "border-red-400/70 bg-red-500/18 shadow-[0_0_32px_rgba(248,113,113,0.45)] scale-110"
              : isBusy
                ? "cursor-default border-amber-300/25 bg-amber-300/8 opacity-60"
                : isInterruptingPlayback
                  ? "border-amber-300/65 bg-amber-300/14 hover:border-amber-300/90 hover:bg-amber-300/22 hover:shadow-[0_0_28px_rgba(245,158,11,0.4)] active:scale-95"
                  : "border-amber-300/50 bg-amber-300/10 hover:border-amber-300/80 hover:bg-amber-300/18 hover:shadow-[0_0_24px_rgba(245,158,11,0.35)] active:scale-95"
        }`}
        disabled={isUnsupported || isDenied || disabled || isBusy}
        onClick={() => void handleMicClick()}
        title={
          isUnsupported
            ? "Voice recording not supported in this browser"
            : isDenied
              ? "Microphone access denied — check browser settings"
              : isConsentMissing
                ? "Microphone processing consent required"
                : isRecording
                  ? "Click to stop recording"
                  : isInterruptingPlayback
                    ? "Click to interrupt and speak"
                    : "Click to speak"
        }
        type="button"
      >
        {/* Pulse ring when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />
            <span className="absolute inset-[-6px] animate-pulse rounded-full border border-red-400/40" />
          </>
        )}

        {/* Speaking indicator */}
        {voiceState === "speaking" && (
          <span className="absolute inset-[-6px] animate-pulse rounded-full border border-amber-300/40" />
        )}

        {/* Mic SVG icon */}
        <MicIcon isRecording={isRecording} voiceState={voiceState} />
      </button>

      {/* Permission denied message */}
      {isDenied && (
        <p
          className="max-w-[240px] text-center text-xs leading-5 text-red-300/80"
          role="alert"
        >
          Microphone access was denied. Allow access in your browser settings,
          or type your question below.
        </p>
      )}

      {isConsentMissing && !isUnsupported && (
        <p
          className="max-w-[240px] text-center text-xs leading-5 text-amber-200/65"
          role="status"
        >
          Enable local microphone processing before recording, or use typed
          input.
        </p>
      )}

      {/* Unsupported message */}
      {isUnsupported && (
        <p className="max-w-[240px] text-center text-xs leading-5 text-amber-200/55">
          Voice input is not supported in this browser. Please type your
          question below.
        </p>
      )}
    </div>
  );
}

function MicIcon({
  isRecording,
  voiceState,
}: {
  isRecording: boolean;
  voiceState: ConversationPhase;
}) {
  if (
    voiceState === "transcribing" ||
    voiceState === "thinking" ||
    voiceState === "retrieving"
  ) {
    // Spinner
    return (
      <svg
        aria-hidden="true"
        className="h-6 w-6 animate-spin text-amber-300"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (voiceState === "speaking") {
    // Speaker wave icon
    return (
      <svg
        aria-hidden="true"
        className="h-6 w-6 text-amber-300"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
      >
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }

  // Mic icon — red when recording, amber/gold otherwise
  return (
    <svg
      aria-hidden="true"
      className={`h-6 w-6 ${isRecording ? "text-red-400" : "text-amber-300"}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <rect height="11" rx="3" width="6" x="9" y="2" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    </svg>
  );
}
