export const MICROPHONE_CONSENT_VERSION = "local-voice-v1";

export function hasStoredMicrophoneConsent(user: {
  microphoneConsentGivenAt: Date | string | null;
}) {
  return Boolean(user.microphoneConsentGivenAt);
}
