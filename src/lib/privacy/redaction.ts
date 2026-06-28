const SENSITIVE_KEY_PATTERN =
  /(audio|base64|password|token|secret|api[_-]?key|authorization|cookie)/i;

const RAW_CONTENT_KEY_PATTERN =
  /(answer|body|chunk|content|excerpt|message|preview|prompt|query|text|transcript)/i;

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]"],
  [
    /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[redacted-phone]",
  ],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]"],
  [/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-card]"],
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[redacted-key]"],
  [
    /\b[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
    "[redacted-token]",
  ],
];

export function redactText(value: string, maxLength = 2000) {
  const redacted = REDACTION_PATTERNS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );

  return redacted.length > maxLength
    ? `${redacted.slice(0, maxLength)}...[truncated]`
    : redacted;
}

function summarizeContent(value: unknown) {
  if (typeof value === "string") {
    return {
      redacted: true,
      type: "string",
      length: value.length,
    };
  }

  if (Array.isArray(value)) {
    return {
      redacted: true,
      type: "array",
      itemCount: value.length,
    };
  }

  if (value && typeof value === "object") {
    return {
      redacted: true,
      type: "object",
      keyCount: Object.keys(value).length,
    };
  }

  return {
    redacted: true,
    type: typeof value,
  };
}

export function redactForLogs(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForLogs(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      redacted[key] = "[redacted]";
    } else if (RAW_CONTENT_KEY_PATTERN.test(key)) {
      redacted[key] = summarizeContent(child);
    } else {
      redacted[key] = redactForLogs(child);
    }
  }

  return redacted;
}
