import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { appEventContractSchema, appEventNames } from "@/lib/events/contracts";

const SERVER_ONLY_ENV_NAMES = [
  "SUPABASE_SECRET_KEY",
  "PINECONE_API_KEY",
  "RESEND_API_KEY",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "SENTRY_AUTH_TOKEN",
  "DATABASE_URL",
];

function sourceFiles(dir = path.join(process.cwd(), "src")): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return sourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(entry)) {
      return [];
    }

    return [path.relative(process.cwd(), fullPath)];
  });
}

describe("managed-services boundary", () => {
  it("keeps server-only provider keys out of client components", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      if (!/^\s*["']use client["']/.test(text)) continue;

      for (const envName of SERVER_ONLY_ENV_NAMES) {
        if (text.includes(envName)) {
          violations.push(`${file} references ${envName}`);
        }
      }

      if (text.includes("@/lib/providers")) {
        violations.push(`${file} imports provider boundary modules`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("defines only the approved future event contracts", () => {
    expect(appEventNames).toEqual([
      "account.created",
      "auth.login.succeeded",
      "document.ingestion.requested",
      "document.ingestion.failed",
      "document.ingestion.completed",
    ]);
  });

  it("does not route current Auth.js activation through Supabase", () => {
    const authRoute = readFileSync(
      path.join(process.cwd(), "src/app/api/auth/[...nextauth]/route.ts"),
      "utf8",
    );
    const authConfig = readFileSync(
      path.join(process.cwd(), "src/auth.ts"),
      "utf8",
    );

    expect(authRoute).toContain("@/auth");
    expect(authRoute).not.toContain("supabase");
    expect(authConfig).toContain("next-auth/providers/credentials");
    expect(authConfig).not.toContain("SUPABASE");
    expect(authConfig).not.toContain("@/lib/providers/supabase");
  });

  it("rejects raw email, IP, prompt, answer, and transcript fields in event contracts", () => {
    const result = appEventContractSchema.safeParse({
      eventId: "event-1",
      idempotencyKey: "account.created:user-1",
      name: "account.created",
      occurredAt: "2026-06-28T00:00:00.000Z",
      prompt: "private prompt",
      rawAnswer: "private answer",
      transcript: "private transcript",
      userEmail: "seeker@example.com",
      userId: "user-1",
      userIp: "203.0.113.10",
      workspaceId: "workspace-1",
    });

    expect(result.success).toBe(false);
  });
});
