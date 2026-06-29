import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const minimalEnv = {
  HOME: process.env.HOME ?? "",
  PATH: process.env.PATH ?? "",
  TERM: process.env.TERM ?? "dumb",
};

function importEnvWith(extraEnv: Record<string, string> = {}) {
  return execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `const mod = await import("./src/env.ts");
const env = mod.env ?? mod.default?.env;
if (!env) {
  throw new Error("env export is unavailable");
}
console.log(JSON.stringify({
  authSecret: env.AUTH_SECRET,
  databaseUrl: env.DATABASE_URL,
}));`,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...minimalEnv, ...extraEnv } as unknown as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

describe("build-time env placeholders", () => {
  it("allows Next production build imports without real secrets", () => {
    const output = importEnvWith({
      NEXT_PHASE: "phase-production-build",
    });

    expect(JSON.parse(output)).toEqual({
      authSecret: "build-time-placeholder-auth-secret-at-least-32-chars",
      databaseUrl:
        "postgresql://build:build@localhost:5432/shri_ai_build?schema=public",
    });
  });

  it("treats empty build env values as missing placeholders", () => {
    const output = importEnvWith({
      AUTH_SECRET: "",
      DATABASE_URL: "",
      NEXT_PHASE: "phase-production-build",
    });

    expect(JSON.parse(output)).toEqual({
      authSecret: "build-time-placeholder-auth-secret-at-least-32-chars",
      databaseUrl:
        "postgresql://build:build@localhost:5432/shri_ai_build?schema=public",
    });
  });

  it("still rejects missing runtime AUTH_SECRET and DATABASE_URL", () => {
    expect(() => importEnvWith()).toThrow(/AUTH_SECRET|DATABASE_URL/);
  });
});
