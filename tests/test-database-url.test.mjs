import { describe, expect, it } from "vitest";

import { validateTestDatabaseEnvironment } from "../scripts/check-test-database-url.mjs";

describe("test database URL preflight", () => {
  it("requires TEST_DATABASE_URL for integration checks", () => {
    expect(
      validateTestDatabaseEnvironment({}, { required: true }),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("TEST_DATABASE_URL is required"),
    });
  });

  it("rejects production-like remote hostnames", () => {
    expect(
      validateTestDatabaseEnvironment(
        {
          TEST_DATABASE_URL:
            "postgresql://user:pass@app-prod.rds.amazonaws.com:5432/shri_ai_test",
        },
        { required: true },
      ),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("production-like hostname"),
    });
  });

  it("rejects ambiguous database names", () => {
    expect(
      validateTestDatabaseEnvironment(
        {
          TEST_DATABASE_URL: "postgresql://user:pass@localhost:5432/shri_ai",
        },
        { required: true },
      ),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("disposable test/CI database"),
    });
  });

  it("rejects DATABASE_URL drift when TEST_DATABASE_URL is configured", () => {
    expect(
      validateTestDatabaseEnvironment(
        {
          TEST_DATABASE_URL:
            "postgresql://test:test@localhost:5432/shri_ai_test",
          DATABASE_URL: "postgresql://prod:prod@localhost:5432/shri_ai",
        },
        { required: true },
      ),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("DATABASE_URL differs"),
    });
  });

  it("accepts an explicit disposable local test database", () => {
    const url = "postgresql://test:test@localhost:5432/shri_ai_test";

    expect(
      validateTestDatabaseEnvironment(
        { TEST_DATABASE_URL: url, DATABASE_URL: url },
        { required: true },
      ),
    ).toEqual({ ok: true, databaseUrl: url });
  });
});
