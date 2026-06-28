import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("UUID migration", () => {
  it("preflight rejects invalid legacy values", () => {
    const migration = readFileSync(
      "prisma/migrations/20260628180000_correct_supabase_auth_mapping/migration.sql",
      "utf8",
    );
    expect(migration).toContain(
      "!~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'",
    );
    expect(migration).toContain("RAISE EXCEPTION");
  });

  it("preserves null-only rows", () => {
    const migration = readFileSync(
      "prisma/migrations/20260628180000_correct_supabase_auth_mapping/migration.sql",
      "utf8",
    );
    expect(migration).toContain('WHERE "authUserId" IS NOT NULL');
  });
});
