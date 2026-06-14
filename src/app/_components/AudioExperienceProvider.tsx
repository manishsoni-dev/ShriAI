"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAudioContextConstructor,
  getBrowserCapabilities,
} from "@/lib/browser-capabilities";

export const OM_ENABLED_KEY = "shri-ai:om-enabled";
export const OM_VOLUME_KEY = "shri-ai:om-volume";

const DEFAULT_VOLUME = 0.15;
const MAX_VOLUME = 0.42;
const DUCKED_VOLUME_RATIO = 0.22;
const FADE_MS = 420;
const OM_BASE_FREQUENCY = 136.1;

type AmbientOmStatus = "paused" | "ready" | "playing" | "unavailable";

type OmNodes = {
  context: AudioContext;
  gain: GainNode;
  highGain: GainNode;
  highTone: OscillatorNode;
  lowGain: GainNode;
  lowTone: OscillatorNode;
};

export function clampOmVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(MAX_VOLUME, Math.max(0, value));
}

export function getAmbientOmStatus(input: {
  enabled: boolean;
  isPlaying: boolean;
  isSupported: boolean;
}): AmbientOmStatus {
  if (!input.isSupported) return "unavailable";
  if (input.isPlaying) return "playing";
  if (input.enabled) return "ready";
  return "paused";
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function readStoredVolume(): number {
  try {
    return clampOmVolume(Number(window.localStorage.getItem(OM_VOLUME_KEY)));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function persistPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in private or restricted contexts.
  }
}

function createOmNodes(): OmNodes | null {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return null;

  const context = new AudioContextConstructor();
  const gain = context.createGain();
  const lowGain = context.createGain();
  const highGain = context.createGain();
  const lowTone = context.createOscillator();
  const highTone = context.createOscillator();

  lowTone.type = "sine";
  highTone.type = "triangle";
  lowTone.frequency.value = OM_BASE_FREQUENCY;
  highTone.frequency.value = OM_BASE_FREQUENCY * 1.5;

  lowGain.gain.value = 0.72;
  highGain.gain.value = 0.1;
  gain.gain.value = 0;

  lowTone.connect(lowGain);
  highTone.connect(highGain);
  lowGain.connect(gain);
  highGain.connect(gain);
  gain.connect(context.destination);

  lowTone.start();
  highTone.start();

  return {
    context,
    gain,
    highGain,
    highTone,
    lowGain,
    lowTone,
  };
}

function stopNodes(nodes: OmNodes | null) {
  if (!nodes) return;

  try {
    nodes.lowTone.stop();
  } catch {
    // Already stopped.
  }

  try {
    nodes.highTone.stop();
  } catch {
    // Already stopped.
  }

  void nodes.context.close().catch(() => undefined);
}

function rampGain(nodes: OmNodes, targetVolume: number) {
  const now = nodes.context.currentTime;
  nodes.gain.gain.cancelScheduledValues(now);
  nodes.gain.gain.setTargetAtTime(targetVolume, now, FADE_MS / 1000 / 4);
}

export function AudioExperienceProvider() {
  const capabilities = getBrowserCapabilities();
  const isSupported = capabilities.webAudio;

  const nodesRef = useRef<OmNodes | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const duckingReasonsRef = useRef(new Set<string>());

  const [isClient, setIsClient] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  const getEffectiveVolume = useCallback(
    () =>
      duckingReasonsRef.current.size > 0
        ? volume * DUCKED_VOLUME_RATIO
        : volume,
    [volume],
  );

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const ensureNodes = useCallback(() => {
    if (nodesRef.current) return nodesRef.current;
    const nodes = createOmNodes();
    nodesRef.current = nodes;
    return nodes;
  }, []);

  const stopAudio = useCallback(
    (immediate = false) => {
      pendingPlayRef.current = false;
      const nodes = nodesRef.current;
      if (!nodes) {
        setIsPlaying(false);
        return;
      }

      clearStopTimer();
      rampGain(nodes, 0);
      setIsPlaying(false);

      if (immediate) {
        stopNodes(nodes);
        nodesRef.current = null;
        return;
      }

      stopTimerRef.current = window.setTimeout(() => {
        stopNodes(nodesRef.current);
        nodesRef.current = null;
        stopTimerRef.current = null;
      }, FADE_MS + 80);
    },
    [clearStopTimer],
  );

  const playAudio = useCallback(async () => {
    if (!isSupported) return false;

    const nodes = ensureNodes();
    if (!nodes) return false;

    clearStopTimer();

    try {
      if (nodes.context.state === "suspended") {
        await nodes.context.resume();
      }
      rampGain(nodes, getEffectiveVolume());
      pendingPlayRef.current = false;
      setIsPlaying(true);
      return true;
    } catch (error) {
      pendingPlayRef.current = true;
      console.warn("[AudioExperienceProvider] OM playback is pending:", error);
      setIsPlaying(false);
      return false;
    }
  }, [clearStopTimer, ensureNodes, getEffectiveVolume, isSupported]);

  const applyDucking = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes || !isPlaying) return;
    rampGain(nodes, getEffectiveVolume());
  }, [getEffectiveVolume, isPlaying]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVolume(readStoredVolume());
      const storedEnabled = readStoredBoolean(OM_ENABLED_KEY, false);
      setEnabled(storedEnabled);
      pendingPlayRef.current = storedEnabled;
      setIsClient(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      clearStopTimer();
      stopAudio(true);
    };
  }, [clearStopTimer, stopAudio]);

  useEffect(() => {
    if (!isClient) return;
    persistPreference(OM_ENABLED_KEY, String(enabled));
  }, [enabled, isClient]);

  useEffect(() => {
    if (!isClient) return;
    persistPreference(OM_VOLUME_KEY, String(volume));
    applyDucking();
  }, [applyDucking, isClient, volume]);

  useEffect(() => {
    if (!isClient || !enabled || !isSupported || isPlaying) return;

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
  }, [enabled, isClient, isPlaying, isSupported, playAudio]);

  useEffect(() => {
    if (!isClient) return;
    const duckingReasons = duckingReasonsRef.current;

    function duck(reason: string) {
      duckingReasons.add(reason);
      applyDucking();
    }

    function unduck(reason: string) {
      duckingReasons.delete(reason);
      applyDucking();
    }

    const handleTtsStart = () => duck("tts");
    const handleTtsEnd = () => unduck("tts");
    const handleVoiceStart = () => duck("voice");
    const handleVoiceEnd = () => unduck("voice");

    window.addEventListener("shri-ai:tts-start", handleTtsStart);
    window.addEventListener("shri-ai:tts-end", handleTtsEnd);
    window.addEventListener("shri-ai:voice-start", handleVoiceStart);
    window.addEventListener("shri-ai:voice-end", handleVoiceEnd);

    return () => {
      window.removeEventListener("shri-ai:tts-start", handleTtsStart);
      window.removeEventListener("shri-ai:tts-end", handleTtsEnd);
      window.removeEventListener("shri-ai:voice-start", handleVoiceStart);
      window.removeEventListener("shri-ai:voice-end", handleVoiceEnd);
      duckingReasons.clear();
      applyDucking();
    };
  }, [applyDucking, isClient]);

  async function handleToggle() {
    if (!isSupported) return;

    if (isPlaying) {
      setEnabled(false);
      stopAudio();
      return;
    }

    setEnabled(true);
    pendingPlayRef.current = true;
    await playAudio();
  }

  if (!isClient) return null;

  const status = getAmbientOmStatus({ enabled, isPlaying, isSupported });
  const disabled = status === "unavailable";
  const statusLabel =
    status === "playing"
      ? "Playing"
      : status === "ready"
        ? "Ready"
        : status === "unavailable"
          ? "Unavailable"
          : "Paused";

  return (
    <div
      aria-label="OM ambient sound controls"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2 rounded-lg border border-amber-200/15 bg-[#090604]/88 p-2 text-amber-50 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl"
      role="group"
    >
      <button
        aria-label={isPlaying ? "Pause OM sound" : "Play OM sound"}
        aria-pressed={isPlaying}
        className={`grid min-h-10 min-w-12 place-items-center rounded-md border px-3 text-xs font-semibold transition ${
          isPlaying
            ? "border-amber-300/45 bg-amber-300/14 text-amber-100 shadow-[0_0_26px_rgba(245,158,11,0.22)]"
            : "border-amber-200/14 bg-white/[0.04] text-amber-100/72 hover:border-amber-200/32"
        } disabled:cursor-not-allowed disabled:opacity-45`}
        disabled={disabled}
        onClick={() => void handleToggle()}
        title={
          disabled
            ? "Ambient OM sound is unavailable in this browser"
            : isPlaying
              ? "Pause OM sound"
              : "Enable OM ambient sound"
        }
        type="button"
      >
        {status === "playing" ? "OM" : statusLabel}
      </button>

      <input
        aria-label="OM volume"
        className="h-24 w-2 accent-amber-300"
        disabled={disabled}
        max={MAX_VOLUME}
        min="0"
        onChange={(event) =>
          setVolume(clampOmVolume(Number(event.target.value)))
        }
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
