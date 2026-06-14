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
  /**
   * ElevenLabs voice ID for premium TTS.
   * See: https://api.elevenlabs.io/v1/voices
   * These are default IDs — replace with your preferred ElevenLabs voices.
   */
  elevenLabsVoiceId: string;
  /** ElevenLabs model — multilingual v2 handles Sanskrit pronunciation better. */
  elevenLabsModel: string;
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
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB", // Adam — deep, clear male
    elevenLabsModel: "eleven_multilingual_v2",
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
    elevenLabsVoiceId: "VR6AewLTigWG4xSOukaG", // Arnold — warm, confident
    elevenLabsModel: "eleven_multilingual_v2",
  },
  shiva: {
    // Deep, meditative — slow pace, spacious pauses, low intensity
    preferredVoiceKeywords: ["daniel", "arthur", "en-gb", "en-au", "male"],
    rate: 0.72,
    pitch: 0.78,
    volume: 0.8,
    maxTtsChars: 1000,
    gender: "male",
    elevenLabsVoiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh — deep, meditative
    elevenLabsModel: "eleven_multilingual_v2",
  },
  hanuman: {
    // Strong, humble, energetic — clear articulation, devotional courage
    preferredVoiceKeywords: ["alex", "rishi", "en-in", "en-us", "male"],
    rate: 0.94,
    pitch: 1.0,
    volume: 0.88,
    maxTtsChars: 1000,
    gender: "male",
    elevenLabsVoiceId: "yoZ06aMxZJJ28mfd3POQ", // Sam — strong, clear
    elevenLabsModel: "eleven_multilingual_v2",
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
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — calm, clear female
    elevenLabsModel: "eleven_multilingual_v2",
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
    elevenLabsVoiceId: "AZnzlk1XvdvUeBnXmlld", // Domi — soft, expressive female
    elevenLabsModel: "eleven_multilingual_v2",
  },
};

export function getVoiceProfile(personaId: PersonaId): VoiceProfile {
  return voiceProfiles[personaId];
}
