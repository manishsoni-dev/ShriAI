import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { auth } from "@/auth";
import { unifiedLogout } from "@/app/actions/logout";

// Mock dependencies
vi.mock("@/lib/auth/current-actor", () => ({
  getCurrentActor: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/actions/logout", () => ({
  unifiedLogout: vi.fn(),
}));

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if Supabase session is unlinked", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: null,
      reason: "SUPABASE_AUTH_LINK_MISSING",
    });

    (auth as import("vitest").Mock).mockResolvedValue({
      user: { id: "legacy-id", email: "test@example.com" },
      expires: "123",
    });

    const user = await getAuthenticatedUser();

    expect(user).toBeNull();
    expect(getCurrentActor).toHaveBeenCalled();
    expect(auth).toHaveBeenCalled();
    expect(unifiedLogout).not.toHaveBeenCalled();
  });

  it("returns null and logs out if Supabase session is invalid", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: null,
      reason: "SUPABASE_AUTH_SESSION_INVALID",
    });

    (auth as import("vitest").Mock).mockResolvedValue({
      user: { id: "legacy-id", email: "test@example.com" },
      expires: "123",
    });

    const user = await getAuthenticatedUser();

    expect(user).toBeNull();
    expect(unifiedLogout).toHaveBeenCalledOnce();
  });

  it("returns null and logs out if identities conflict", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: {
        id: "user1",
        email: "user1@example.com",
        name: null,
        imageUrl: null,
      },
      reason: null,
    });

    (auth as import("vitest").Mock).mockResolvedValue({
      user: { id: "user2", email: "user2@example.com" },
      expires: "123",
    });

    const user = await getAuthenticatedUser();

    expect(user).toBeNull();
    expect(unifiedLogout).toHaveBeenCalledOnce();
  });

  it("returns Supabase actor if valid and no conflict", async () => {
    const mockActor = {
      id: "user1",
      email: "user1@example.com",
      name: null,
      imageUrl: null,
    };
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: mockActor,
      reason: null,
    });
    // No auth.js session

    (auth as import("vitest").Mock).mockResolvedValue(null);

    const result = await getAuthenticatedUser();

    expect(result).toEqual({ user: mockActor });
    expect(unifiedLogout).not.toHaveBeenCalled();
  });

  it("returns Supabase actor if both sessions match", async () => {
    const mockActor = {
      id: "user1",
      email: "user1@example.com",
      name: null,
      imageUrl: null,
    };
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: mockActor,
      reason: null,
    });

    (auth as import("vitest").Mock).mockResolvedValue({
      user: { id: "user1-authjs", email: "user1@example.com" },
      expires: "123",
    });

    const result = await getAuthenticatedUser();

    expect(result).toEqual({ user: mockActor });
    expect(unifiedLogout).not.toHaveBeenCalled();
  });

  it("falls back to Auth.js session if no Supabase actor", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: null,
      reason: "SUPABASE_AUTH_UNAVAILABLE", // Not unlinked, just no session
    });
    const mockAuthJsUser = { id: "user2", email: "user2@example.com" };

    (auth as import("vitest").Mock).mockResolvedValue({
      user: mockAuthJsUser,
      expires: "123",
    });

    const result = await getAuthenticatedUser();

    expect(result).toEqual({ user: mockAuthJsUser });
    expect(unifiedLogout).not.toHaveBeenCalled();
  });

  it("returns null if no sessions exist", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      actor: null,
      reason: "SUPABASE_AUTH_UNAVAILABLE",
    });

    (auth as import("vitest").Mock).mockResolvedValue(null);

    const result = await getAuthenticatedUser();

    expect(result).toBeNull();
  });
});
