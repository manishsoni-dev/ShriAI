import "server-only";

export type ProviderAvailabilityCode =
  | "INNGEST_NOT_CONFIGURED"
  | "PINECONE_DIMENSION_MISMATCH"
  | "PINECONE_NOT_CONFIGURED"
  | "POSTHOG_NOT_CONFIGURED"
  | "RESEND_NOT_CONFIGURED"
  | "SENTRY_NOT_CONFIGURED"
  | "SUPABASE_NOT_CONFIGURED";

export type ProviderStatus =
  | {
      status: "configured";
    }
  | {
      code: ProviderAvailabilityCode;
      status: "failed" | "not_configured";
    };

export function configured(): ProviderStatus {
  return { status: "configured" };
}

export function notConfigured(code: ProviderAvailabilityCode): ProviderStatus {
  return { code, status: "not_configured" };
}

export function failed(code: ProviderAvailabilityCode): ProviderStatus {
  return { code, status: "failed" };
}

export function hasAllValues(values: Array<string | number | undefined>) {
  return values.every((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    return typeof value === "string" && value.trim().length > 0;
  });
}
