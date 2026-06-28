import "server-only";

import { db } from "@/lib/db";
import { env } from "@/env";

// Pre-defined static default flags (so we don't fail closed if the DB row doesn't exist yet)
const DEFAULT_FLAGS: Record<string, boolean> = {
  voice_input: true,
  document_upload: false,
  study_mode: true,
  beta_invites: env.ENABLE_BETA_INVITES === "true",
};

/**
 * Checks a server-side feature flag.
 * Reads from the database to allow runtime toggling, falling back to static defaults.
 */
export async function getFeatureFlag(name: string): Promise<boolean> {
  try {
    const flag = await db.featureFlag.findUnique({
      where: { name },
    });

    if (flag) {
      return flag.enabled;
    }

    return DEFAULT_FLAGS[name] ?? false;
  } catch (error) {
    console.error(`Failed to read feature flag ${name}:`, error);
    // Fail safely (default)
    return DEFAULT_FLAGS[name] ?? false;
  }
}

/**
 * Set a feature flag (admin use only)
 */
export async function setFeatureFlag(
  name: string,
  enabled: boolean,
  updatedBy?: string,
): Promise<void> {
  await db.featureFlag.upsert({
    where: { name },
    update: { enabled, updatedBy },
    create: { name, enabled, updatedBy },
  });
}
