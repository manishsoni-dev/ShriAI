import { normalizeAIError } from "@/lib/ai/errors";

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  provider: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withAIRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
) {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const aiError = normalizeAIError(error, options.provider);
      const canRetry = aiError.retryable && attempt < attempts;

      if (!canRetry) {
        throw aiError;
      }

      await wait(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw normalizeAIError(
    new Error("AI retry loop exhausted unexpectedly."),
    options.provider,
  );
}
