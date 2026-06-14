import { afterEach, describe, expect, it, vi } from "vitest";

import { getReviewerPrincipal } from "@/lib/auth/reviewer-authorization";

describe("getReviewerPrincipal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("authorizes admins from ADMIN_EMAILS", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    expect(
      getReviewerPrincipal({ id: "user-1", email: "Admin@Example.com" }),
    ).toEqual({
      id: "user-1",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("authorizes reviewers from REVIEWER_EMAILS", () => {
    vi.stubEnv("REVIEWER_EMAILS", "reviewer@example.com");

    expect(
      getReviewerPrincipal({ id: "user-2", email: "reviewer@example.com" }),
    ).toMatchObject({ role: "reviewer" });
  });

  it("rejects ordinary authenticated users", () => {
    vi.stubEnv("REVIEWER_EMAILS", "reviewer@example.com");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    expect(
      getReviewerPrincipal({ id: "user-3", email: "member@example.com" }),
    ).toBeNull();
  });
});
