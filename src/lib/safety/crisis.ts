const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicide\b/i,
  /\bsuicidal\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt myself\b/i,
  /\bcan't go on\b/i,
  /\bwant to die\b/i,
];

export function detectCrisisIntent(text: string) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

export function crisisSupportMessage() {
  return [
    "I am really sorry you are carrying this. If you might hurt yourself or someone else, call emergency services now.",
    "In the United States or Canada, call or text 988 for immediate crisis support. If you are elsewhere, contact your local emergency number or a trusted person who can stay with you right now.",
    "I can stay with you here for a moment, but this needs real human support immediately.",
  ].join("\n\n");
}
