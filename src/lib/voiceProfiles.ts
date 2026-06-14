import type { PersonaId } from "@/lib/personas";

/**
 * Natural devotional human voice profiles.
 * Used for both browser Web Speech Synthesis and ElevenLabs TTS.
 * These are guidance voice profiles — not claims of divine voice.
 */
export type VoiceProfile = {
  /** Keywords to match against SpeechSynthesisVoice.name (case-insensitive) */
  preferredVoiceKeywords: string[];
  /** Speech rate. 1.0 = normal. Range: 0.1–2. */
  rate: number;
  /** Pitch. 1.0 = normal. Range: 0–2. */
  pitch: number;
  /** Volume. Range: 0–1. */
  volume: number;
  /** Maximum characters before TTS truncation. */
  maxTtsChars: number;
  /** Preferred gender hint for voice selection. */
  gender: "male" | "female" | "neutral";
};

export const voiceProfiles: Record<PersonaId, VoiceProfile> = {
  rama: {
    // Mature, calm, principled — kingly authority with compassion
    preferredVoiceKeywords: [
      "daniel",
      "alex",
      "arthur",
      "male",
      "en-in",
      "en-gb",
    ],
    rate: 0.82,
    pitch: 0.85,
    volume: 0.84,
    maxTtsChars: 1000,
    gender: "male",
  },
  krishna: {
    // Warm, graceful, intelligent — gentle confidence, slightly musical
    preferredVoiceKeywords: [
      "alex",
      "daniel",
      "rishi",
      "en-in",
      "en-gb",
      "en-us",
    ],
    rate: 0.9,
    pitch: 0.95,
    volume: 0.86,
    maxTtsChars: 1000,
    gender: "male",
  },
  shiva: {
    // Deep, meditative — slow pace, spacious pauses, low intensity
    preferredVoiceKeywords: ["daniel", "arthur", "en-gb", "en-au", "male"],
    rate: 0.72,
    pitch: 0.78,
    volume: 0.8,
    maxTtsChars: 1000,
    gender: "male",
  },
  hanuman: {
    // Strong, humble, energetic — clear articulation, devotional courage
    preferredVoiceKeywords: ["alex", "rishi", "en-in", "en-us", "male"],
    rate: 0.94,
    pitch: 1.0,
    volume: 0.88,
    maxTtsChars: 1000,
    gender: "male",
  },
  sita: {
    // Calm, resilient — soft but firm, dignified emotional strength
    preferredVoiceKeywords: [
      "samantha",
      "victoria",
      "kate",
      "veena",
      "female",
      "en-in",
      "en-gb",
    ],
    rate: 0.85,
    pitch: 1.05,
    volume: 0.82,
    maxTtsChars: 1000,
    gender: "female",
  },
  radha: {
    // Soft, devotional — lyrical, emotionally refined
    preferredVoiceKeywords: [
      "samantha",
      "karen",
      "moira",
      "veena",
      "female",
      "en-au",
      "en-in",
    ],
    rate: 0.88,
    pitch: 1.1,
    volume: 0.8,
    maxTtsChars: 1000,
    gender: "female",
  },
};

export function getVoiceProfile(personaId: PersonaId): VoiceProfile {
  return voiceProfiles[personaId];
}
