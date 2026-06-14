"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const OM_AUDIO_PATH = "/audio/om.mp3";
const ENABLED_KEY = "shri-ai:om-enabled";
const VOLUME_KEY = "shri-ai:om-volume";
const DEFAULT_VOLUME = 0.15;
const isDev = process.env.NODE_ENV === "development";

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
}

function readStoredVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.min(0.45, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

/**
 * AudioExperienceProvider — manages OM background audio using HTMLAudioElement.
 * Audio only starts after the first user interaction (browser autoplay policy).
 * Persists enabled/volume preference in localStorage.
 * Gracefully handles missing audio file.
 */
export function AudioExperienceProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [fileError, setFileError] = useState(false);
  // Whether we're waiting for a gesture to resume audio (enabled but blocked)
  const pendingPlayRef = useRef(false);

  // ── Initialize audio element once on mount ─────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = DEFAULT_VOLUME;
    audio.preload = "none";

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      if (isDev) {
        console.warn(
          "[AudioExperienceProvider] OM audio not found at",
          OM_AUDIO_PATH,
          "— place public/audio/om.mp3 to enable OM sound.",
        );
      }
      setFileError(true);
      setIsPlaying(false);
    };

    audio.src = OM_AUDIO_PATH;
    audioRef.current = audio;

    // Hydrate preferences (scheduled to avoid synchronous setState-in-effect)
    const timer = window.setTimeout(() => {
      const storedEnabled = readStoredBoolean(ENABLED_KEY, false);
      const storedVolume = readStoredVolume();
      audio.volume = storedVolume;
      setVolume(storedVolume);
      setEnabled(storedEnabled);
      // Mark as pending so first gesture triggers play if enabled
      if (storedEnabled) {
        pendingPlayRef.current = true;
      }
      setIsClient(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // ── Persist preferences ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(ENABLED_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, [enabled, isClient]);

  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, isClient]);

  // ── Audio control ──────────────────────────────────────────────────────────
  const playAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || fileError) return;

    try {
      audio.volume = volume;
      await audio.play();
      setIsPlaying(true);
      pendingPlayRef.current = false;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (isDev) console.warn("[AudioExperienceProvider] play() failed:", err);
      // Autoplay blocked — stays pending for next gesture
    }
  }, [fileError, volume]);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  // ── First-gesture listener (fires once when enabled + pending) ─────────────
  useEffect(() => {
    if (!isClient || !enabled || fileError || isPlaying) return;

    const handleGesture = () => {
      if (pendingPlayRef.current) {
        void playAudio();
      }
    };

    window.addEventListener("pointerdown", handleGesture, {
      capture: true,
      once: true,
    });
    window.addEventListener("keydown", handleGesture, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handleGesture, {
        capture: true,
      });
      window.removeEventListener("keydown", handleGesture, { capture: true });
    };
  }, [isClient, enabled, fileError, isPlaying, playAudio]);

  // ── Auto-pause when disabled ───────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    if (!enabled && isPlaying) {
      const timer = window.setTimeout(() => pauseAudio(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isClient, enabled, isPlaying, pauseAudio]);

  // ── Audio Ducking (TTS active) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    const handleTTSStart = () => {
      if (audioRef.current) {
        audioRef.current.volume = volume * 0.2;
      }
    };
    const handleTTSEnd = () => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    };
    window.addEventListener("shri-ai:tts-start", handleTTSStart);
    window.addEventListener("shri-ai:tts-end", handleTTSEnd);
    return () => {
      window.removeEventListener("shri-ai:tts-start", handleTTSStart);
      window.removeEventListener("shri-ai:tts-end", handleTTSEnd);
      // Ensure volume is restored on unmount
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    };
  }, [isClient, volume]);

  // ── User toggle ────────────────────────────────────────────────────────────
  async function handleToggle() {
    if (fileError) return;

    if (enabled || isPlaying) {
      setEnabled(false);
      pendingPlayRef.current = false;
      pauseAudio();
    } else {
      setEnabled(true);
      pendingPlayRef.current = true;
      await playAudio().catch(() => {
        // Autoplay blocked — pendingPlayRef will trigger on next gesture
      });
    }
  }

  if (!isClient) return null;

  const isActive = isPlaying;

  return (
    <div
      aria-label="OM ambient sound controls"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2 rounded-lg border border-amber-200/15 bg-[#090604]/88 p-2 text-amber-50 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl"
      role="group"
    >
      <button
        aria-label={isActive ? "Pause OM sound" : "Play OM sound"}
        aria-pressed={isActive}
        className={`grid min-h-10 min-w-12 place-items-center rounded-md border px-3 text-xs font-semibold transition ${
          isActive
            ? "border-amber-300/45 bg-amber-300/14 text-amber-100 shadow-[0_0_26px_rgba(245,158,11,0.22)]"
            : "border-amber-200/14 bg-white/[0.04] text-amber-100/72 hover:border-amber-200/32"
        } disabled:cursor-not-allowed disabled:opacity-45`}
        disabled={fileError}
        onClick={() => void handleToggle()}
        title={
          fileError
            ? "OM audio file not found — place public/audio/om.mp3"
            : isActive
              ? "Pause OM sound"
              : "Enable OM ambient sound"
        }
        type="button"
      >
        {isActive ? "OM" : "Enable Sound"}
      </button>

      <input
        aria-label="OM volume"
        className="h-24 w-2 accent-amber-300"
        disabled={fileError}
        max="0.45"
        min="0"
        onChange={(e) => setVolume(Number(e.target.value))}
        step="0.01"
        style={{
          direction: "rtl",
          writingMode: "vertical-lr",
        }}
        title="OM volume"
        type="range"
        value={volume}
      />
    </div>
  );
}
