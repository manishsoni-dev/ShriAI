import "server-only";

import { redactForLogs } from "@/lib/privacy/redaction";

export type LogLevel = "info" | "warn" | "error";

export type LogContext = {
  route?: string;
  latencyMs?: number;
  status?: number;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  workspaceId?: string | null;
  model?: string | null;
  errorCategory?: string;
  traceId?: string;
  [key: string]: unknown; // Allow other safe structured fields
};

/**
 * Structured server-side logging for production discipline.
 * Prevents leaking raw prompts, secrets, or audio buffers by exclusively
 * accepting safe identifiers and explicitly bounded context objects.
 */
export function logStructured(
  level: LogLevel,
  message: string,
  context: LogContext = {},
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...((redactForLogs(context) as Record<string, unknown>) ?? {}),
  };

  const formatted = JSON.stringify(payload);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}
