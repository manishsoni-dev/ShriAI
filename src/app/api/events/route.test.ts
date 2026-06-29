import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  logProductEvent: vi.fn(),
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/lib/product-events", () => ({
  logProductEvent: mocks.logProductEvent,
}));

import { POST } from "./route";

function eventRequest(body: Record<string, unknown>) {
  return new Request("https://app.example.com/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "user-owner" },
    });
    mocks.logProductEvent.mockResolvedValue(undefined);
  });

  it("allows anonymous landing page events only", async () => {
    mocks.getAuthenticatedUser.mockResolvedValueOnce(null);

    const response = await POST(
      eventRequest({ eventType: "landing_page_viewed", traceId: "trace-1" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.logProductEvent).toHaveBeenCalledWith("landing_page_viewed", {
      userId: null,
      traceId: "trace-1",
      personaId: undefined,
      metadata: undefined,
    });
  });

  it("denies protected client events without a resolved user", async () => {
    mocks.getAuthenticatedUser.mockResolvedValueOnce(null);

    const response = await POST(
      eventRequest({ eventType: "starter_prompt_selected" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.logProductEvent).not.toHaveBeenCalled();
  });

  it("uses only the server-resolved user id for protected events", async () => {
    const response = await POST(
      eventRequest({
        eventType: "starter_prompt_selected",
        traceId: "trace-2",
        personaId: "krishna",
        userId: "attacker-controlled",
        metadata: { promptId: "duty" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.logProductEvent).toHaveBeenCalledWith(
      "starter_prompt_selected",
      {
        userId: "user-owner",
        traceId: "trace-2",
        personaId: "krishna",
        metadata: { promptId: "duty" },
      },
    );
  });
});
