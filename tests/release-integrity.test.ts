import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release integrity configuration", () => {
  it("makes lint warnings fail the lint command", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts.lint).toContain("--max-warnings=0");
  });

  it("tracks no real environment files", () => {
    const tracked = execFileSync(
      "git",
      [
        "ls-files",
        "--",
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
      ],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
    expect(tracked).toEqual([]);
  });

  it("keeps local-model release gates out of hosted CI", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(ci).not.toContain("npm run scripture:eval");
    expect(ci).not.toContain("npm run release:check");
    expect(packageJson.scripts["release:verify:local"]).toContain(
      "npm run scripture:eval",
    );
    expect(packageJson.scripts["release:verify:local"]).toContain(
      "npm run release:check",
    );
  });

  it("pins Caddy CI validation configuration", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const compose = readFileSync("docker-compose.yml", "utf8");
    expect(ci).toContain("caddy:2.8.4-alpine");
    expect(compose).toContain("caddy:2.8.4-alpine");
    expect(ci).toContain(
      "caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile",
    );
    expect(ci).not.toContain("caddy:latest");
    expect(ci).not.toContain("caddy:2-alpine");
  });

  it("requires source archives to be created from clean tracked commits", () => {
    const createArchive = readFileSync(
      "scripts/create-source-archive.mjs",
      "utf8",
    );
    expect(createArchive).toContain('git(["status", "--porcelain"])');
    expect(createArchive).toContain('"archive"');
    expect(createArchive).toContain("verifySourceArchive");
  });

  it("allows microphone only for the same app origin through Caddy and has no Next conflict", () => {
    const caddy = readFileSync("Caddyfile", "utf8");
    const nextConfig = readFileSync("next.config.ts", "utf8");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const compose = readFileSync("docker-compose.yml", "utf8");

    expect(caddy).toContain("microphone=(self)");
    expect(caddy).toContain("camera=()");
    expect(caddy).toContain("geolocation=()");
    expect(nextConfig).not.toContain("Permissions-Policy");
    expect(compose).toContain("caddy:2.8.4-alpine");
    expect(ci).toContain("caddy validate --config /etc/caddy/Caddyfile");
    expect(ci).toContain("caddy:2.8.4-alpine");
  });

  it("requires manual Voice QA evidence for release readiness", () => {
    const releaseCheck = readFileSync(
      "scripts/check-release-readiness.ts",
      "utf8",
    );
    const createQa = readFileSync("scripts/create-voice-qa-run.ts", "utf8");
    const seedQa = readFileSync("scripts/seed-voice-qa-run.ts", "utf8");

    expect(releaseCheck).toContain('evidenceSource: "manual"');
    expect(releaseCheck).toContain("invalidatedAt: null");
    expect(createQa).toContain('status: "pending"');
    expect(createQa).toContain('evidenceSource: "manual"');
    expect(seedQa).toContain('evidenceSource: "automated_fixture"');
    expect(seedQa).toContain('status: "invalid"');
  });
});
