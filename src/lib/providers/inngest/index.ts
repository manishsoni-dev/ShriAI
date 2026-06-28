import "server-only";

import { env } from "@/env";
import {
  configured,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type InngestBoundary = {
  jobExecutionEnabled: false;
  provider: "inngest";
};

let boundary: InngestBoundary | undefined;

export function getInngestProviderStatus() {
  if (!hasAllValues([env.INNGEST_EVENT_KEY, env.INNGEST_SIGNING_KEY])) {
    return notConfigured("INNGEST_NOT_CONFIGURED");
  }

  return configured();
}

export function getInngestBoundary(): InngestBoundary | null {
  if (getInngestProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    jobExecutionEnabled: false,
    provider: "inngest",
  };

  return boundary;
}
