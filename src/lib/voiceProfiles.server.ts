import "server-only";

import type { PersonaId } from "@/lib/personas";
import { getVoiceProfile, type VoiceProfile } from "@/lib/voiceProfiles";

export type ProviderVoiceProfile = VoiceProfile & {
  providerVoiceId: string;
  providerModel: string;
  providerSettings: {
    similarity_boost: number;
    stability: number;
    style: number;
    use_speaker_boost: boolean;
  };
};

const providerProfiles: Record<
  PersonaId,
  Pick<
    ProviderVoiceProfile,
    "providerModel" | "providerSettings" | "providerVoiceId"
  >
> = {
  rama: {
    providerVoiceId: "pNInz6obpgDQGcFmaJgB",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.72,
      similarity_boost: 0.76,
      style: 0.12,
      use_speaker_boost: true,
    },
  },
  krishna: {
    providerVoiceId: "VR6AewLTigWG4xSOukaG",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.58,
      similarity_boost: 0.78,
      style: 0.22,
      use_speaker_boost: true,
    },
  },
  shiva: {
    providerVoiceId: "TxGEqnHWrfWFTfGW9XjX",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.82,
      similarity_boost: 0.74,
      style: 0.08,
      use_speaker_boost: true,
    },
  },
  hanuman: {
    providerVoiceId: "yoZ06aMxZJJ28mfd3POQ",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.62,
      similarity_boost: 0.8,
      style: 0.28,
      use_speaker_boost: true,
    },
  },
  sita: {
    providerVoiceId: "21m00Tcm4TlvDq8ikWAM",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.7,
      similarity_boost: 0.78,
      style: 0.16,
      use_speaker_boost: true,
    },
  },
  radha: {
    providerVoiceId: "AZnzlk1XvdvUeBnXmlld",
    providerModel: "eleven_multilingual_v2",
    providerSettings: {
      stability: 0.64,
      similarity_boost: 0.8,
      style: 0.32,
      use_speaker_boost: true,
    },
  },
};

export function getProviderVoiceProfile(
  personaId: PersonaId,
): ProviderVoiceProfile {
  return {
    ...getVoiceProfile(personaId),
    ...providerProfiles[personaId],
  };
}
