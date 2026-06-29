import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  createServerClient: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/workspaces", () => ({
  ensureDefaultWorkspace: mocks.ensureDefaultWorkspace,
}));

import { GET } from "./route";

const confirmedUser = {
  id: "7e9ea0c2-7f1a-4d22-8ab5-f40a53035750",
  email: "new@example.com",
  email_confirmed_at: "2026-06-29T00:00:00.000Z",
  user_metadata: { name: "New User" },
};

function callbackRequest(query = "code=valid-code") {
  return new Request(
    `https://app.example.com/api/auth/supabase/callback?${query}`,
  );
}

function locationPath(response: Response) {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location ?? "https://app.example.com").pathname;
}

function setupConfiguredSupabase() {
  mocks.createServerClient.mockResolvedValue({
    client: {
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        getUser: mocks.getUser,
        signOut: mocks.signOut,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: confirmedUser },
    error: null,
  });
  mocks.signOut.mockResolvedValue(undefined);
  mocks.ensureDefaultWorkspace.mockResolvedValue(undefined);
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.userCreate.mockResolvedValue({
    id: "app-user-1",
    email: "new@example.com",
    name: "New User",
  });
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      user: {
        findUnique: mocks.userFindUnique,
        create: mocks.userCreate,
      },
    }),
  );
  setupConfiguredSupabase();
});

describe("Supabase auth callback", () => {
  it("rejects missing codes without touching Supabase or the database", async () => {
    const response = await GET(callbackRequest(""));

    expect(locationPath(response)).toBe("/sign-in");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("uses only the fixed dashboard redirect and ignores arbitrary next targets", async () => {
    const response = await GET(
      callbackRequest("code=valid-code&next=https://evil.example/phish"),
    );

    expect(locationPath(response)).toBe("/dashboard");
    expect(response.headers.get("location")).not.toContain("evil.example");
  });

  it("signs out and redirects safely when the code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: new Error("expired"),
    });

    const response = await GET(callbackRequest());
    const location = response.headers.get("location") ?? "";

    expect(locationPath(response)).toBe("/sign-in");
    expect(location).not.toContain("expired");
    expect(location).not.toContain("new@example.com");
    expect(location).not.toContain(confirmedUser.id);
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not create an application user before email confirmation", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: {
        user: {
          ...confirmedUser,
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    const response = await GET(callbackRequest());

    expect(locationPath(response)).toBe("/sign-in");
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("does not auto-link an existing legacy account by email", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "legacy-user",
      email: "new@example.com",
      supabaseAuthUserId: null,
    });

    const response = await GET(callbackRequest());

    expect(locationPath(response)).toBe("/sign-in");
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
  });

  it("is idempotent for an already linked Supabase subject", async () => {
    const existingUser = {
      id: "app-user-1",
      email: "new@example.com",
      name: "New User",
      supabaseAuthUserId: confirmedUser.id,
    };
    mocks.userFindUnique.mockResolvedValueOnce(existingUser);

    const response = await GET(callbackRequest());

    expect(locationPath(response)).toBe("/dashboard");
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.ensureDefaultWorkspace).toHaveBeenCalledWith(
      existingUser,
      expect.anything(),
    );
  });

  it("provisions a new confirmed Supabase subject exactly once", async () => {
    const response = await GET(callbackRequest());

    expect(locationPath(response)).toBe("/dashboard");
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        name: "New User",
        passwordHash: "",
        supabaseAuthUserId: confirmedUser.id,
      }),
    });
    expect(mocks.ensureDefaultWorkspace).toHaveBeenCalledOnce();
  });
});
