import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mocks.compare,
  hash: mocks.hash,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: mocks.userCreate,
      findUnique: mocks.userFindUnique,
    },
    betaInvite: {
      findUnique: vi.fn().mockResolvedValue({ id: "valid-invite" }),
    },
    featureFlag: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@/lib/workspaces", () => ({
  ensureDefaultWorkspace: mocks.ensureDefaultWorkspace,
}));

import {
  createCredentialsUser,
  DuplicateEmailError,
  InvalidCredentialsError,
  verifyCredentials,
} from "@/lib/auth/users";

describe("credential user access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureDefaultWorkspace.mockResolvedValue({ id: "workspace-1" });
    mocks.hash.mockResolvedValue("hashed-password");
  });

  it("verifies an existing user and ensures their workspace", async () => {
    const user = {
      id: "user-1",
      email: "seeker@example.com",
      passwordHash: "hash",
    };
    mocks.userFindUnique.mockResolvedValueOnce(user);
    mocks.compare.mockResolvedValueOnce(true);

    await expect(
      verifyCredentials({
        email: "Seeker@Example.com ",
        password: "password123",
      }),
    ).resolves.toBe(user);

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "seeker@example.com" },
    });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.ensureDefaultWorkspace).toHaveBeenCalledWith(user);
  });

  it("does not create an account during normal sign-in", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);

    await expect(
      verifyCredentials({
        email: "unknown@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
  });

  it("rejects invalid passwords without revealing account state", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "seeker@example.com",
      passwordHash: "hash",
    });
    mocks.compare.mockResolvedValueOnce(false);

    await expect(
      verifyCredentials({
        email: "seeker@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("creates a user only through explicit registration", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);
    mocks.userCreate.mockResolvedValueOnce({
      id: "user-new",
      email: "new@example.com",
      name: "New User",
      passwordHash: "hashed-password",
    });

    const user = await createCredentialsUser({
      email: "New@Example.com ",
      name: " New User ",
      password: "password123",
    });

    expect(user.email).toBe("new@example.com");
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: "new@example.com",
        name: "New User",
        passwordHash: "hashed-password",
      },
    });
    expect(mocks.ensureDefaultWorkspace).toHaveBeenCalledWith(user);
  });

  it("rejects duplicate registration without changing the existing account", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-existing",
      email: "taken@example.com",
    });

    await expect(
      createCredentialsUser({
        email: "taken@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);

    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});
