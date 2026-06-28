import "server-only";

import { env } from "@/env";
import {
  configured,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type SentryBoundary = {
  provider: "sentry";
  requestBodyCaptureEnabled: false;
  releaseUploadConfigured: boolean;
};

let boundary: SentryBoundary | undefined;

export function getSentryProviderStatus() {
  if (!hasAllValues([env.NEXT_PUBLIC_SENTRY_DSN])) {
    return notConfigured("SENTRY_NOT_CONFIGURED");
  }

  return configured();
}

export function getSentryBoundary(): SentryBoundary | null {
  if (getSentryProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    provider: "sentry",
    releaseUploadConfigured: hasAllValues([env.SENTRY_AUTH_TOKEN]),
    requestBodyCaptureEnabled: false,
  };

  return boundary;
}
