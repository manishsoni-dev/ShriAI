import "server-only";

import { env } from "@/env";
import {
  configured,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type ResendBoundary = {
  provider: "resend";
  sendingEnabled: false;
};

let boundary: ResendBoundary | undefined;

export function getResendProviderStatus() {
  if (!hasAllValues([env.RESEND_API_KEY, env.RESEND_FROM_EMAIL])) {
    return notConfigured("RESEND_NOT_CONFIGURED");
  }

  return configured();
}

export function getResendBoundary(): ResendBoundary | null {
  if (getResendProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    provider: "resend",
    sendingEnabled: false,
  };

  return boundary;
}
