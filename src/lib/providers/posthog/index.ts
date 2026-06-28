import "server-only";

import { env } from "@/env";
import {
  configured,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type PostHogBoundary = {
  automaticCaptureEnabled: false;
  provider: "posthog";
  sessionRecordingEnabled: false;
};

let boundary: PostHogBoundary | undefined;

export function getPostHogProviderStatus() {
  if (
    !hasAllValues([env.NEXT_PUBLIC_POSTHOG_KEY, env.NEXT_PUBLIC_POSTHOG_HOST])
  ) {
    return notConfigured("POSTHOG_NOT_CONFIGURED");
  }

  return configured();
}

export function getPostHogBoundary(): PostHogBoundary | null {
  if (getPostHogProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    automaticCaptureEnabled: false,
    provider: "posthog",
    sessionRecordingEnabled: false,
  };

  return boundary;
}
