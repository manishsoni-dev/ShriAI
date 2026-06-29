import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("CI test environment contract", () => {
  it("keeps production build separate from placeholder CI build", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.build).toBe("next build");
    expect(packageJson.scripts["build:ci"]).toBe(
      "node scripts/run-with-test-env.mjs npm run build",
    );
    expect(packageJson.scripts["test:ci"]).toBe(
      "node scripts/run-with-test-env.mjs npm run test",
    );
    expect(packageJson.scripts["build:ci"]).not.toContain("source ");
    expect(packageJson.scripts["test:ci"]).not.toContain("source ");
  });

  it("loads only .env.test placeholders without overriding CI env", () => {
    const runner = readFileSync("scripts/run-with-test-env.mjs", "utf8");

    expect(runner).toContain('path.resolve(process.cwd(), ".env.test")');
    expect(runner).toContain("override: false");
    expect(runner).not.toContain(".env.local");
    expect(runner).not.toContain("SKIP_ENV_VALIDATION");
  });

  it("uses deterministic CI commands and an explicit disposable test database", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    expect(workflow).toContain("TEST_DATABASE_URL:");
    expect(workflow).toContain("shri_ai_ci");
    expect(workflow).toContain("npm run test:db:preflight");
    expect(workflow).toContain("npm run test:ci");
    expect(workflow).toContain("npm run build:ci");
  });
});
