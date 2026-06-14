"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAudioContextConstructor,
  getBrowserCapabilities,
  type BrowserCapabilities,
} from "@/lib/browser-capabilities";

const ENABLED_STORAGE_KEY = "shri-ai:ambient-om-enabled";
const VOLUME_STORAGE_KEY = "shri-ai:ambient-om-volume";
const DEFAULT_VOLUME = 0.16;
const INITIAL_CAPABILITIES: BrowserCapabilities = {
  isClient: false,
  platform: "unknown",
  speechRecognition: false,
  speechSynthesis: false,
  webAudio: false,
};

type AmbientNodes = {
  context: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
};

function readStoredBoolean(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function readStoredVolume() {
  try {
    const value = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));

    if (Number.isFinite(value)) {
      return Math.min(0.45, Math.max(0, value));
    }
  } catch {
    return DEFAULT_VOLUME;
  }

  return DEFAULT_VOLUME;
}

export function AmbientOmSound() {
  const [capabilities, setCapabilities] =
    useState<BrowserCapabilities>(INITIAL_CAPABILITIES);
  const [enabled, setEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const nodesRef = useRef<AmbientNodes | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      const nextCapabilities = getBrowserCapabilities();
      setCapabilities(nextCapabilities);
      setEnabled(readStoredBoolean(ENABLED_STORAGE_KEY, false));
      setVolume(readStoredVolume());

      document.documentElement.dataset.platform = nextCapabilities.platform;
      document.documentElement.dataset.webAudio = String(
        nextCapabilities.webAudio,
      );
      document.documentElement.dataset.speechRecognition = String(
        nextCapabilities.speechRecognition,
      );
      document.documentElement.dataset.speechSynthesis = String(
        nextCapabilities.speechSynthesis,
      );
    }, 0);

    return () => window.clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      return;
    }
  }, [enabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      return;
    }

    const nodes = nodesRef.current;

    if (nodes) {
      const now = nodes.context.currentTime;
      nodes.masterGain.gain.cancelScheduledValues(now);
      nodes.masterGain.gain.setTargetAtTime(volume, now, 0.14);
    }
  }, [volume]);

  const stopAmbient = useCallback((immediate = false) => {
    const nodes = nodesRef.current;

    if (!nodes) {
      setIsPlaying(false);
      return;
    }

    const releaseSeconds = immediate ? 0 : 0.25;
    const now = nodes.context.currentTime;
    nodes.masterGain.gain.cancelScheduledValues(now);
    nodes.masterGain.gain.setTargetAtTime(0.0001, now, 0.06);

    const stopNodes = () => {
      nodes.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          return;
        }
      });
      void nodes.context.close();
      nodesRef.current = null;
      stopTimerRef.current = null;
      setIsPlaying(false);
    };

    if (immediate) {
      stopNodes();
      return;
    }

    stopTimerRef.current = window.setTimeout(stopNodes, releaseSeconds * 1000);
  }, []);

  const startAmbient = useCallback(async () => {
    if (nodesRef.current || !capabilities.webAudio) {
      return;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return;
    }

    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    const context = new AudioContextConstructor();
    const masterGain = context.createGain();
    const now = context.currentTime;
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.0001),
      now + 1.6,
    );
    masterGain.connect(context.destination);

    const tones = [
      { frequency: 68.05, gain: 0.28, type: "sine" as OscillatorType },
      { frequency: 136.1, gain: 0.52, type: "sine" as OscillatorType },
      { frequency: 272.2, gain: 0.16, type: "triangle" as OscillatorType },
    ];

    const oscillators = tones.map((tone) => {
      const oscillator = context.createOscillator();
      const toneGain = context.createGain();
      oscillator.frequency.value = tone.frequency;
      oscillator.type = tone.type;
      toneGain.gain.value = tone.gain;
      oscillator.connect(toneGain);
      toneGain.connect(masterGain);
      oscillator.start(now);
      return oscillator;
    });

    if (context.state === "suspended") {
      await context.resume().catch(() => undefined);
    }

    nodesRef.current = {
      context,
      masterGain,
      oscillators,
    };
    setIsPlaying(true);
  }, [capabilities.webAudio, volume]);

  useEffect(() => {
    if (!enabled || !capabilities.webAudio || isPlaying) {
      return;
    }

    const handleFirstGesture = () => {
      void startAmbient();
    };

    window.addEventListener("pointerdown", handleFirstGesture, {
      capture: true,
      once: true,
    });
    window.addEventListener("keydown", handleFirstGesture, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture, {
        capture: true,
      });
      window.removeEventListener("keydown", handleFirstGesture, {
        capture: true,
      });
    };
  }, [capabilities.webAudio, enabled, isPlaying, startAmbient]);

  useEffect(() => {
    return () => {
      stopAmbient(true);
    };
  }, [stopAmbient]);

  async function handleToggle() {
    if (!capabilities.webAudio) {
      return;
    }

    if (enabled || isPlaying) {
      setEnabled(false);
      stopAmbient();
      return;
    }

    setEnabled(true);
    await startAmbient();
  }

  const unavailable = capabilities.isClient && !capabilities.webAudio;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-amber-200/15 bg-[#090604]/88 p-2 text-amber-50 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <button
        aria-label={isPlaying ? "Pause OM sound" : "Play OM sound"}
        aria-pressed={isPlaying}
        className={`grid h-10 w-12 place-items-center rounded-md border text-xs font-semibold tracking-[0.18em] transition ${
          isPlaying
            ? "border-amber-300/45 bg-amber-300/14 text-amber-100 shadow-[0_0_26px_rgba(245,158,11,0.22)]"
            : "border-amber-200/14 bg-white/[0.04] text-amber-100/72 hover:border-amber-200/32"
        } disabled:cursor-not-allowed disabled:opacity-45`}
        disabled={unavailable}
        onClick={handleToggle}
        title={unavailable ? "OM sound is not supported in this browser" : "OM"}
        type="button"
      >
        OM
      </button>
      <input
        aria-label="OM volume"
        className="h-2 w-24 accent-amber-300"
        disabled={unavailable}
        max="0.45"
        min="0"
        onChange={(event) => setVolume(Number(event.target.value))}
        step="0.01"
        type="range"
        value={volume}
      />
    </div>
  );
}
