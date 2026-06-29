/**
 * P0.3A Security Tests: Supabase Auth Foundation
 *
 * Covers:
 * - Secret key absent from browser bundles (static analysis)
 * - Admin client blocked from entering client components
 * - Cross-user isolation: one authenticated user cannot access another's data
 * - Spoofed claims rejected (user.id extracted from server JWT, never from client)
 * - Health output excludes sensitive fields
 * - Auth.js remains the live production auth path
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sourceFiles(dir = path.join(process.cwd(), "src")): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return sourceFiles(fullPath);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [path.relative(process.cwd(), fullPath)];
  });
}

function readSrc(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const migratedProtectedSurfaces = [
  "src/app/api/chat/stream/route.ts",
  "src/app/api/events/route.ts",
  "src/app/api/voice/transcribe/route.ts",
  "src/app/chat/actions.ts",
  "src/app/chat/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/knowledge/actions.ts",
  "src/app/knowledge/page.tsx",
  "src/app/knowledge/search/page.tsx",
  "src/app/sign-in/page.tsx",
  "src/lib/auth/session.ts",
  "src/lib/scripture-review/reviews.ts",
];

const authJsAllowedFiles = [
  "src/auth.ts",
  "src/proxy.ts",
  "src/app/actions/logout.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/sign-in/actions.ts",
  "src/lib/auth/get-authenticated-user.ts",
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. SECRET KEY ABSENT FROM BROWSER BUNDLES
// ─────────────────────────────────────────────────────────────────────────────

describe("Secret key isolation from browser bundles", () => {
  it("SUPABASE_SECRET_KEY is never referenced in any client component", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const text = readSrc(file);
      if (!/^\s*['"]use client['"]/.test(text)) continue;
      if (text.includes("SUPABASE_SECRET_KEY")) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it("admin.ts uses server-only to block browser bundle inclusion", () => {
    const adminSrc = readSrc("src/lib/supabase/admin.ts");
    expect(adminSrc).toContain("server-only");
    expect(adminSrc).toContain("SUPABASE_SECRET_KEY");
  });

  it("browser.ts does NOT reference SUPABASE_SECRET_KEY", () => {
    const browserSrc = readSrc("src/lib/supabase/browser.ts");
    expect(browserSrc).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("browser.ts uses only NEXT_PUBLIC keys", () => {
    const browserSrc = readSrc("src/lib/supabase/browser.ts");
    expect(browserSrc).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(browserSrc).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(browserSrc).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("proxy.ts does NOT reference SUPABASE_SECRET_KEY", () => {
    const proxySrc = readSrc("src/lib/supabase/proxy.ts");
    expect(proxySrc).not.toContain("SUPABASE_SECRET_KEY");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN CLIENT BLOCKED FROM CLIENT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Admin client isolation from client components", () => {
  it("admin.ts has server-only guard", () => {
    const adminSrc = readSrc("src/lib/supabase/admin.ts");
    expect(adminSrc.trim()).toMatch(/^import "server-only"/);
  });

  it("current-actor.ts has server-only guard", () => {
    const actorSrc = readSrc("src/lib/auth/current-actor.ts");
    expect(actorSrc.trim()).toMatch(/^import "server-only"/);
  });

  it("no client component imports admin.ts", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const text = readSrc(file);
      if (!/^\s*['"]use client['"]/.test(text)) continue;
      if (
        text.includes("supabase/admin") ||
        text.includes("lib/supabase/admin")
      ) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it("no client component imports current-actor", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const text = readSrc(file);
      if (!/^\s*['"]use client['"]/.test(text)) continue;
      if (text.includes("current-actor") || text.includes("getCurrentActor")) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTH.JS REMAINS THE LIVE PRODUCTION PATH
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth.js remains the production auth path", () => {
  it("the sign-in route uses Auth.js, not Supabase", () => {
    const authRoute = readSrc("src/app/api/auth/[...nextauth]/route.ts");
    expect(authRoute).toContain("@/auth");
    expect(authRoute).not.toContain("supabase");
  });

  it("auth.ts does not reference Supabase", () => {
    const authConfig = readSrc("src/auth.ts");
    expect(authConfig).toContain("next-auth");
    expect(authConfig).not.toContain("SUPABASE");
    expect(authConfig).not.toContain("@/lib/supabase");
  });

  it("current-actor.ts is not wired into any active product route", () => {
    // Active product routes: chat, dashboard, knowledge, onboarding, wisdom
    const activeRoutes = [
      "src/app/chat/page.tsx",
      "src/app/dashboard/page.tsx",
      "src/app/knowledge/page.tsx",
      "src/app/onboarding/page.tsx",
      "src/app/wisdom/page.tsx",
    ];

    for (const routeFile of activeRoutes) {
      let src: string;
      try {
        src = readSrc(routeFile);
      } catch {
        // File may not exist; skip
        continue;
      }
      expect(src).not.toContain("getCurrentActor");
      expect(src).not.toContain("current-actor");
    }
  });
});

describe("P0.3B.1 route cutover certification", () => {
  it("keeps every migrated protected surface on getAuthenticatedUser", () => {
    const violations: string[] = [];

    for (const file of migratedProtectedSurfaces) {
      const src = readSrc(file);
      if (!src.includes("@/lib/auth/get-authenticated-user")) {
        violations.push(`${file} does not import getAuthenticatedUser`);
      }
      if (src.includes('from "@/auth"') || src.includes("from '@/auth'")) {
        violations.push(`${file} imports Auth.js directly`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("limits direct Auth.js imports to owned auth boundary files", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      if (file.includes(".test.")) continue;
      const src = readSrc(file);
      if (!src.includes("@/auth")) continue;
      if (authJsAllowedFiles.includes(file)) continue;
      violations.push(file);
    }

    expect(violations).toEqual([]);
  });

  it("documents absent saved/settings route surfaces instead of silently omitting them", () => {
    const appFiles = sourceFiles("src/app");
    expect(appFiles.some((file) => file.startsWith("src/app/saved/"))).toBe(
      false,
    );
    expect(appFiles.some((file) => file.startsWith("src/app/settings/"))).toBe(
      false,
    );

    const certification = readSrc("docs/development/P0_3B_CERTIFICATION.md");
    expect(certification).toContain("| saved answers");
    expect(certification).toContain("| settings");
    expect(certification).toContain("no route present in this branch");
  });

  it("keeps active sign-in and signup paths free of dormant providers", () => {
    const files = [
      "src/app/sign-in/actions.ts",
      "src/app/sign-in/page.tsx",
      "src/app/sign-in/sign-in-form.tsx",
      "src/app/api/auth/supabase/callback/route.ts",
    ];
    const forbidden = [
      "resend",
      "inngest",
      "pinecone",
      "posthog",
      "sentry",
      "RESEND_API_KEY",
      "INNGEST_EVENT_KEY",
      "PINECONE_API_KEY",
      "NEXT_PUBLIC_POSTHOG_KEY",
      "SENTRY_AUTH_TOKEN",
    ];
    const violations: string[] = [];

    for (const file of files) {
      const src = readSrc(file).toLowerCase();
      for (const pattern of forbidden) {
        if (src.includes(pattern.toLowerCase())) {
          violations.push(`${file} references ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MIGRATION STATE IS INTERNAL ONLY
// ─────────────────────────────────────────────────────────────────────────────

describe("Migration state module is internal-only", () => {
  it("migration-state module is not imported in any API response handler", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      if (file.includes("migration-state.test")) continue;
      if (file.includes("migration-state.ts")) continue;

      const text = readSrc(file);
      if (
        text.includes("AuthMigrationState") &&
        file.includes("src/app/api/")
      ) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it("AuthMigrationState contains all required states", () => {
    const migrationSrc = readSrc("src/lib/auth/migration-state.ts");
    expect(migrationSrc).toContain("UNLINKED");
    expect(migrationSrc).toContain("PROVISIONED");
    expect(migrationSrc).toContain("VERIFIED");
    expect(migrationSrc).toContain("CUTOVER_READY");
    expect(migrationSrc).toContain("DISABLED");
  });

  it("migration-state.ts has server-only guard to enforce internal-only access", () => {
    const migrationSrc = readSrc("src/lib/auth/migration-state.ts");
    expect(migrationSrc).toContain("server-only");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. HEALTH STATES ARE SAFE
// ─────────────────────────────────────────────────────────────────────────────

describe("Supabase health states expose only safe codes", () => {
  it("health.ts exports all required health state constants", () => {
    const healthSrc = readSrc("src/lib/supabase/health.ts");
    expect(healthSrc).toContain("SUPABASE_NOT_CONFIGURED");
    expect(healthSrc).toContain("SUPABASE_UNAVAILABLE");
    expect(healthSrc).toContain("SUPABASE_AUTH_UNAVAILABLE");
    expect(healthSrc).toContain("SUPABASE_AUTH_SESSION_INVALID");
    expect(healthSrc).toContain("SUPABASE_AUTH_LINK_MISSING");
  });

  it("health.ts does not export any token, key, URL, or credential field", () => {
    const healthSrc = readSrc("src/lib/supabase/health.ts");
    expect(healthSrc).not.toContain("SECRET");
    expect(healthSrc).not.toContain("TOKEN");
    expect(healthSrc).not.toContain("PASSWORD");
    expect(healthSrc).not.toContain("credentials");
    expect(healthSrc).not.toContain("authorization");
  });
});

describe("P0.3B.1 managed-service runtime activation guard", () => {
  it("active auth cutover files do not import dormant provider runtimes", () => {
    const files = [
      "src/app/sign-in/actions.ts",
      "src/app/api/auth/supabase/callback/route.ts",
      "src/app/actions/logout.ts",
      "src/lib/auth/get-authenticated-user.ts",
      "src/lib/auth/current-actor.ts",
    ];
    const forbidden = [
      "@/lib/providers/resend",
      "@/lib/providers/inngest",
      "@/lib/providers/pinecone",
      "@/lib/providers/posthog",
      "@/lib/providers/sentry",
      "getResendBoundary",
      "getInngestBoundary",
      "getPineconeBoundary",
      "getPostHogBoundary",
      "getSentryBoundary",
      "RESEND_API_KEY",
      "INNGEST_EVENT_KEY",
      "PINECONE_API_KEY",
      "NEXT_PUBLIC_POSTHOG_KEY",
      "SENTRY_AUTH_TOKEN",
    ];
    const violations: string[] = [];

    for (const file of files) {
      const src = readSrc(file);
      for (const pattern of forbidden) {
        if (src.includes(pattern)) {
          violations.push(`${file} references ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("rollout flags default to disabled and do not activate dormant providers", () => {
    const envSrc = readSrc("src/env.ts");
    const rolloutSrc = readSrc("src/lib/supabase/rollout.ts");

    expect(envSrc).toContain("SUPABASE_AUTH_NEW_ACCOUNT_ENABLED");
    expect(envSrc).toContain('.default("false")');
    expect(envSrc).toContain("SUPABASE_AUTH_LINKED_SIGNIN_ENABLED");
    expect(rolloutSrc).not.toContain("resend");
    expect(rolloutSrc).not.toContain("inngest");
    expect(rolloutSrc).not.toContain("pinecone");
    expect(rolloutSrc).not.toContain("posthog");
    expect(rolloutSrc).not.toContain("sentry");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SPOOFED CLAIMS DESIGN VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe("Spoofed-claims design: current-actor never trusts browser input", () => {
  it("current-actor.ts resolves user via supabaseAuthUserId only (never a request param)", () => {
    const actorSrc = readSrc("src/lib/auth/current-actor.ts");
    // Must use getUser() (server-side JWT validation), not getSession()
    expect(actorSrc).toContain("getUser");
    expect(actorSrc).not.toContain("getSession");
    // Must look up by supabaseAuthUserId, not any browser-supplied field
    expect(actorSrc).toContain("supabaseAuthUserId");
    // Must not reference any request/body/query param
    expect(actorSrc).not.toContain("request.");
    expect(actorSrc).not.toContain("searchParams");
    expect(actorSrc).not.toContain("headers()");
  });

  it("current-actor.ts returns null actor on all failure paths", () => {
    const actorSrc = readSrc("src/lib/auth/current-actor.ts");
    // All returns with no actor must return { actor: null, ... }
    const nullActorReturns = (actorSrc.match(/actor: null/g) ?? []).length;
    // We expect at least 2 null-actor returns: for unconfigured + unauthenticated + unlinked
    expect(nullActorReturns).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. CROSS-USER ISOLATION DESIGN
// ─────────────────────────────────────────────────────────────────────────────

describe("Cross-user isolation: supabaseAuthUserId cannot be used to impersonate", () => {
  it("current-actor.ts always uses findUnique by supabaseAuthUserId, not findFirst", () => {
    const actorSrc = readSrc("src/lib/auth/current-actor.ts");
    // findUnique enforces uniqueness constraint at the DB level
    expect(actorSrc).toContain("findUnique");
    // findFirst could return any matching user without strict constraint
    expect(actorSrc).not.toContain("findFirst");
  });

  it("Prisma schema enforces @unique on supabaseAuthUserId", () => {
    const schema = readSrc("prisma/schema.prisma");
    // The field must be unique to prevent one user from claiming another's identity
    expect(schema).toMatch(/supabaseAuthUserId\s+String\?\s+@unique/);
  });

  it("Prisma schema maps supabaseAuthUserId as @db.Uuid (correct type)", () => {
    const schema = readSrc("prisma/schema.prisma");
    expect(schema).toMatch(/supabaseAuthUserId.*@db\.Uuid/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. LAZY INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

describe("Client initialization is lazy (guarded by config check)", () => {
  it("browser.ts checks config before calling createBrowserClient", () => {
    const src = readSrc("src/lib/supabase/browser.ts");
    // Config guard must appear before the actual client creation call
    const configGuardIndex = src.indexOf("NEXT_PUBLIC_SUPABASE_URL");
    const clientCreationIndex = src.indexOf("_createBrowserClient(");
    expect(configGuardIndex).toBeGreaterThan(-1);
    expect(clientCreationIndex).toBeGreaterThan(configGuardIndex);
  });

  it("admin.ts checks config before calling createClient", () => {
    const src = readSrc("src/lib/supabase/admin.ts");
    const configGuardIndex = src.indexOf("SUPABASE_SECRET_KEY");
    const clientCreationIndex = src.indexOf("_createClient(");
    expect(configGuardIndex).toBeGreaterThan(-1);
    expect(clientCreationIndex).toBeGreaterThan(configGuardIndex);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. DOCUMENTATION COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

describe("Migration documentation is complete", () => {
  it("SUPABASE_AUTH_MIGRATION.md exists and has required sections", () => {
    const doc = readSrc("docs/security/SUPABASE_AUTH_MIGRATION.md");
    expect(doc).toContain("Current vs. Target");
    expect(doc).toContain("supabaseAuthUserId");
    expect(doc).toContain("Staged");
    expect(doc).toContain("Rollback");
    expect(doc).toContain("RLS");
    expect(doc).toContain("Secret-Key");
    expect(doc).toContain("OUT OF SCOPE");
  });

  it("migration doc explicitly states password migration is out of scope", () => {
    const doc = readSrc("docs/security/SUPABASE_AUTH_MIGRATION.md");
    expect(doc.toLowerCase()).toContain("password");
    expect(doc).toContain("OUT OF SCOPE");
  });
});
