import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentActor } from "./current-actor";
import { db } from "../db";
import { createServerClient } from "../supabase/server";
import {
  SUPABASE_AUTH_UNAVAILABLE,
  SUPABASE_AUTH_LINK_MISSING,
} from "../supabase/health";

vi.mock("../db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../supabase/server", () => ({
  createServerClient: vi.fn(),
}));

describe("getCurrentActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing or invalid claims (UNAUTHENTICATED)", async () => {
    // Mock configured client but unauthenticated
    // @ts-expect-error - mock
    createServerClient.mockResolvedValue({
      status: "CONFIGURED",
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("Token expired"),
          }),
        },
      },
    });

    const result = await getCurrentActor();
    expect(result.actor).toBeNull();
    expect(result.reason).toBe(SUPABASE_AUTH_UNAVAILABLE);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unlinked Supabase identities", async () => {
    // @ts-expect-error - mock
    createServerClient.mockResolvedValue({
      status: "CONFIGURED",
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "unlinked-uuid" } },
            error: null,
          }),
        },
      },
    });

    // Mock Prisma finding no user
    // @ts-expect-error - mock
    db.user.findUnique.mockResolvedValue(null);

    const result = await getCurrentActor();
    expect(result.actor).toBeNull();
    expect(result.reason).toBe(SUPABASE_AUTH_LINK_MISSING);
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthUserId: "unlinked-uuid" },
      select: expect.any(Object),
    });
  });

  it("returns a minimal safe actor for valid linked identity", async () => {
    // @ts-expect-error - mock
    createServerClient.mockResolvedValue({
      status: "CONFIGURED",
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "linked-uuid" } },
            error: null,
          }),
        },
      },
    });

    const mockAppUser = {
      id: "app-user-id",
      name: "Test User",
      email: "test@example.com",
      imageUrl: null,
    };

    // @ts-expect-error - mock
    db.user.findUnique.mockResolvedValue(mockAppUser);

    const result = await getCurrentActor();
    expect(result.reason).toBeNull();
    expect(result.actor).toEqual(mockAppUser);
  });
});
