const SENSITIVE_KEY_PATTERN =
  /(audio|base64|password|token|secret|api[_-]?key|authorization|cookie|email|phone|ssn)/i;

const CONTENT_FIELD_PARTS = [
  "answer",
  "content",
  "document",
  "error",
  "excerpt",
  "preview",
  "prompt",
  "query",
  "raw",
  "text",
  "transcript",
];

const SAFE_CONTENT_SUFFIXES = [
  "_class",
  "_code",
  "_count",
  "_id",
  "_length",
  "_status",
  "_type",
];

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]"],
  [
    /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[redacted-phone]",
  ],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]"],
  [/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-card]"],
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g, "[redacted-key]"],
  [/\b(?:api[_-]?key|token)[_:= -]+[A-Za-z0-9_-]{8,}\b/gi, "[redacted-key]"],
  [
    /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
    "[redacted-token]",
  ],
];

function normalizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

export function isSensitiveMetadataKey(key: string) {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function isContentMetadataKey(key: string) {
  const normalized = normalizeKey(key);
  if (SAFE_CONTENT_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return false;
  }

  return normalized
    .split("_")
    .some((part) => CONTENT_FIELD_PARTS.includes(part));
}

export function redactText(value: string, maxLength = 2000) {
  const redacted = REDACTION_PATTERNS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );

  return redacted.length > maxLength
    ? `${redacted.slice(0, maxLength)}...[truncated]`
    : redacted;
}

function summarizeContentValue(value: unknown): unknown {
  if (typeof value === "string") {
    return { length: value.length };
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return "[omitted]";
  }

  return value === undefined ? undefined : "[omitted]";
}

export function sanitizePrivacyMetadata(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePrivacyMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveMetadataKey(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    if (isContentMetadataKey(key)) {
      sanitized[key] = summarizeContentValue(child);
      continue;
    }

    sanitized[key] = sanitizePrivacyMetadata(child);
  }

  return sanitized;
}

export function redactForLogs(value: unknown): unknown {
  return sanitizePrivacyMetadata(value);
}
