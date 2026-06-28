import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createCredentialsUser: vi.fn(),
  DuplicateEmailError: class DuplicateEmailError extends Error {
    constructor() {
      super("Unable to create account.");
      this.name = "DuplicateEmailError";
    }
  },
  signIn: vi.fn(),
  AuthError: class AuthError extends Error {
    type: string;
    constructor(type: string, message?: string) {
      super(message || "Auth Error");
      this.type = type;
      this.name = "AuthError";
    }
  },
  checkRateLimit: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({
  signIn: mocks.signIn,
}));

vi.mock("@/lib/auth/users", () => ({
  createCredentialsUser: mocks.createCredentialsUser,
  DuplicateEmailError: mocks.DuplicateEmailError,
}));

vi.mock("next-auth", () => ({
  AuthError: mocks.AuthError,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

import { authenticate } from "./actions";

function authForm(input: {
  callbackUrl?: string;
  email?: string;
  mode?: "sign-in" | "register";
  name?: string;
  password?: string;
}) {
  const formData = new FormData();
  if (input.callbackUrl) formData.append("redirectTo", input.callbackUrl);
  if (input.email !== undefined) formData.append("email", input.email);
  if (input.mode) formData.append("mode", input.mode);
  if (input.name !== undefined) formData.append("name", input.name);
  if (input.password !== undefined) formData.append("password", input.password);
  return formData;
}

describe("authenticate action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it("returns generic error on AuthError to prevent enumeration", async () => {
    mocks.signIn.mockRejectedValueOnce(
      new mocks.AuthError("CredentialsSignin", "Some internal error"),
    );

    const result = await authenticate(
      undefined,
      authForm({
        email: "test@example.com",
        mode: "sign-in",
        password: "password123",
      }),
    );

    expect(result).toMatchObject({
      email: "test@example.com",
      message: "Unable to sign in with those credentials.",
      mode: "sign-in",
    });
    expect(result).not.toHaveProperty("password");
  });

  it("rate limits and returns correctly formatted message", async () => {
    mocks.checkRateLimit.mockReturnValue({
      allowed: false,
      retryAfterMs: 60000,
    }); // 1 minute

    const result = await authenticate(
      undefined,
      authForm({
        email: "rate-limit@example.com",
        mode: "sign-in",
        password: "badpassword",
      }),
    );

    expect(result.message).toBe(
      "Too many sign-in attempts. Please try again in 1 minute.",
    );
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("redirects on successful authentication", async () => {
    mocks.signIn.mockResolvedValueOnce(undefined);

    await expect(
      authenticate(
        undefined,
        authForm({
          email: "success@example.com",
          mode: "sign-in",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mocks.createCredentialsUser).not.toHaveBeenCalled();
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "success@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("uses only safe relative redirect targets", async () => {
    mocks.signIn.mockResolvedValueOnce(undefined);

    await expect(
      authenticate(
        undefined,
        authForm({
          callbackUrl: "https://evil.example/dashboard",
          email: "success@example.com",
          mode: "sign-in",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mocks.signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        redirectTo: "/dashboard",
      }),
    );
  });

  it("allows safe first-party relative redirects", async () => {
    mocks.signIn.mockResolvedValueOnce(undefined);

    await expect(
      authenticate(
        undefined,
        authForm({
          callbackUrl: "/chat?persona=krishna",
          email: "success@example.com",
          mode: "sign-in",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/chat?persona=krishna");
  });

  it("creates an account only in explicit registration mode", async () => {
    mocks.createCredentialsUser.mockResolvedValueOnce({
      id: "user-new",
      email: "new@example.com",
    });
    mocks.signIn.mockResolvedValueOnce(undefined);

    await expect(
      authenticate(
        undefined,
        authForm({
          email: "new@example.com",
          mode: "register",
          name: "New User",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mocks.createCredentialsUser).toHaveBeenCalledWith({
      email: "new@example.com",
      name: "New User",
      password: "password123",
    });
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("returns a safe registration error for duplicate accounts", async () => {
    mocks.createCredentialsUser.mockRejectedValueOnce(
      new mocks.DuplicateEmailError(),
    );

    const result = await authenticate(
      undefined,
      authForm({
        email: "taken@example.com",
        mode: "register",
        name: "Taken User",
        password: "password123",
      }),
    );

    expect(result).toMatchObject({
      email: "taken@example.com",
      message: "Unable to create an account with those details.",
      mode: "register",
      name: "Taken User",
    });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("validates malformed fields before calling Auth.js", async () => {
    const result = await authenticate(
      undefined,
      authForm({
        email: "not-email",
        mode: "register",
        password: "short",
      }),
    );

    expect(result.message).toBe("Please check the highlighted fields.");
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.fieldErrors?.password).toBeDefined();
    expect(result.mode).toBe("register");
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("rate limits registration separately", async () => {
    mocks.checkRateLimit.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 120000,
    });

    const result = await authenticate(
      undefined,
      authForm({
        email: "rate-register@example.com",
        mode: "register",
        password: "password123",
      }),
    );

    expect(result.message).toBe(
      "Too many registration attempts. Please try again in 2 minutes.",
    );
    expect(mocks.checkRateLimit).toHaveBeenCalledWith({
      key: "register:127.0.0.1:rate-register@example.com",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
  });
});
