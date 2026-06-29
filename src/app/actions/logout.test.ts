import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authJsSignOut: vi.fn(),
  supabaseSignOut: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@/auth", () => ({
  signOut: mocks.authJsSignOut,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

import { unifiedLogout } from "./logout";

describe("unifiedLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authJsSignOut.mockResolvedValue(undefined);
    mocks.supabaseSignOut.mockResolvedValue(undefined);
  });

  it("clears both Supabase and Auth.js sessions without revealing which existed", async () => {
    mocks.createServerClient.mockResolvedValue({
      client: { auth: { signOut: mocks.supabaseSignOut } },
    });

    await unifiedLogout();

    expect(mocks.supabaseSignOut).toHaveBeenCalledOnce();
    expect(mocks.authJsSignOut).toHaveBeenCalledWith({
      redirectTo: "/sign-in",
    });
  });

  it("still clears Auth.js when Supabase is not configured", async () => {
    mocks.createServerClient.mockResolvedValue({ client: null });

    await unifiedLogout();

    expect(mocks.supabaseSignOut).not.toHaveBeenCalled();
    expect(mocks.authJsSignOut).toHaveBeenCalledWith({
      redirectTo: "/sign-in",
    });
  });

  it("still clears Auth.js if Supabase sign-out fails", async () => {
    mocks.supabaseSignOut.mockRejectedValueOnce(new Error("provider outage"));
    mocks.createServerClient.mockResolvedValue({
      client: { auth: { signOut: mocks.supabaseSignOut } },
    });

    await unifiedLogout();

    expect(mocks.supabaseSignOut).toHaveBeenCalledOnce();
    expect(mocks.authJsSignOut).toHaveBeenCalledWith({
      redirectTo: "/sign-in",
    });
  });
});
