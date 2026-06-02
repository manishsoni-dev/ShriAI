export type AIErrorCode =
  | "AI_AUTHENTICATION_ERROR"
  | "AI_BAD_REQUEST"
  | "AI_RATE_LIMITED"
  | "AI_TRANSIENT_ERROR"
  | "AI_PROVIDER_ERROR"
  | "AI_UNKNOWN_ERROR";

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly provider: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(input: {
    code: AIErrorCode;
    message: string;
    provider: string;
    retryable?: boolean;
    status?: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AIError";
    this.code = input.code;
    this.provider = input.provider;
    this.retryable = input.retryable ?? false;
    this.status = input.status;
  }
}

function readStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = (error as { status?: unknown }).status;

    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function readMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The AI provider returned an unexpected error.";
}

export function normalizeAIError(error: unknown, provider: string): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const status = readStatus(error);
  const message = readMessage(error);

  if (status === 401 || status === 403) {
    return new AIError({
      code: "AI_AUTHENTICATION_ERROR",
      message: "AI provider authentication failed.",
      provider,
      status,
      cause: error,
    });
  }

  if (status === 400 || status === 404) {
    return new AIError({
      code: "AI_BAD_REQUEST",
      message,
      provider,
      status,
      cause: error,
    });
  }

  if (status === 429) {
    return new AIError({
      code: "AI_RATE_LIMITED",
      message: "AI provider rate limit exceeded. Please retry shortly.",
      provider,
      retryable: true,
      status,
      cause: error,
    });
  }

  if (status === 408 || status === 409 || (status && status >= 500)) {
    return new AIError({
      code: "AI_TRANSIENT_ERROR",
      message: "AI provider temporarily failed. Please retry.",
      provider,
      retryable: true,
      status,
      cause: error,
    });
  }

  return new AIError({
    code: "AI_UNKNOWN_ERROR",
    message,
    provider,
    cause: error,
  });
}
