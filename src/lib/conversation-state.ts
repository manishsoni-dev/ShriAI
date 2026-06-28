export type ConversationPhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "retrieving"
  | "thinking"
  | "streaming"
  | "speaking"
  | "interrupted"
  | "error";

export type TerminalStatus = "completed" | "cancelled" | "failed";

export type InteractionMode = "text" | "voice";

export type ConversationTurn = {
  conversationId: string;
  interactionMode: InteractionMode;
  personaId: string;
  traceId: string;
  turnId: string;
};

export const activeConversationPhases = new Set<ConversationPhase>([
  "listening",
  "transcribing",
  "retrieving",
  "thinking",
  "streaming",
  "speaking",
]);

export function isActiveConversationPhase(phase: ConversationPhase) {
  return activeConversationPhases.has(phase);
}

export function isInteractionMode(value: unknown): value is InteractionMode {
  return value === "text" || value === "voice";
}

export function normalizeInteractionMode(input: {
  interactionMode?: unknown;
  legacySource?: unknown;
}): InteractionMode | null {
  if (input.interactionMode === undefined) {
    if (input.legacySource === undefined) return "text";
    return isInteractionMode(input.legacySource) ? input.legacySource : null;
  }

  return isInteractionMode(input.interactionMode)
    ? input.interactionMode
    : null;
}

export function createTurnId() {
  return crypto.randomUUID();
}
