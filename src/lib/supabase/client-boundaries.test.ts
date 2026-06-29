import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBrowserClient } from "./browser";
import { createServerClient } from "./server";
import { createAdminClient } from "./admin";
import { createProxyClient } from "./proxy";
import { SUPABASE_NOT_CONFIGURED } from "./health";

// Mock env
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
  },
}));

import type { NextRequest, NextResponse } from "next/server";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(),
    set: vi.fn(),
  })),
}));

import { env } from "@/env";

describe("Supabase Client Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to unconfigured state
    // @ts-expect-error - overriding read-only props for testing
    env.NEXT_PUBLIC_SUPABASE_URL = "";
    // @ts-expect-error - mock
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    // @ts-expect-error - mock
    env.SUPABASE_SECRET_KEY = "";
  });

  describe("Missing configuration", () => {
    it("returns SUPABASE_NOT_CONFIGURED safely without crashing", async () => {
      expect(createBrowserClient().status).toBe(SUPABASE_NOT_CONFIGURED);

      const serverResult = await createServerClient();
      expect(serverResult.status).toBe(SUPABASE_NOT_CONFIGURED);

      expect(createAdminClient().status).toBe(SUPABASE_NOT_CONFIGURED);

      const mockRequest = {
        cookies: { getAll: vi.fn(), set: vi.fn() },
      } as unknown as NextRequest;
      const mockResponse = {
        cookies: { set: vi.fn() },
      } as unknown as NextResponse;
      expect(createProxyClient(mockRequest, mockResponse).status).toBe(
        SUPABASE_NOT_CONFIGURED,
      );
    });
  });

  describe("Admin client isolation", () => {
    it("initializes only when SUPABASE_SECRET_KEY is present", () => {
      // @ts-expect-error - overriding read-only props for testing
      env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      // @ts-expect-error - mock
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";

      // Still missing secret key
      expect(createAdminClient().status).toBe(SUPABASE_NOT_CONFIGURED);

      // @ts-expect-error - mock
      env.SUPABASE_SECRET_KEY = "secret-key";

      const { status, client } = createAdminClient();
      expect(status).toBe("CONFIGURED");
      expect(client).toBeDefined();
    });
  });
});
