import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  userFindUnique: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
  isReviewerAuthorized: vi.fn(),
  listConversations: vi.fn(),
  usageEventAggregate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    usageEvent: {
      aggregate: mocks.usageEventAggregate,
    },
  },
}));

vi.mock("@/lib/workspaces", () => ({
  ensureDefaultWorkspace: mocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/auth/reviewer-authorization", () => ({
  isReviewerAuthorized: mocks.isReviewerAuthorized,
}));

vi.mock("@/lib/conversations", () => ({
  listConversations: mocks.listConversations,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "1" } });
    mocks.userFindUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      name: "Test User",
    });
    mocks.ensureDefaultWorkspace.mockResolvedValue({
      id: "ws-1",
      name: "Workspace 1",
      slug: "ws-1",
    });
    mocks.isReviewerAuthorized.mockReturnValue(false);
    mocks.usageEventAggregate.mockResolvedValue({
      _count: { id: 0 },
      _sum: { totalTokens: null, inputTokens: null, outputTokens: null },
    });
    mocks.listConversations.mockResolvedValue([]);
  });

  it("redirects unauthenticated users", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("redirects if user not found in DB", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "1" } });
    mocks.userFindUnique.mockResolvedValueOnce(null);
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("loads dashboard data and handles parallel execution", async () => {
    mocks.usageEventAggregate.mockResolvedValueOnce({
      _count: { id: 10 },
      _sum: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
    });
    mocks.listConversations.mockResolvedValueOnce([
      {
        id: "c-1",
        title: "Conv 1",
        metadata: { personaId: "shiva" },
        messages: [],
      },
    ]);

    await DashboardPage();

    expect(mocks.usageEventAggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({ workspaceId: "ws-1", userId: "1" }),
      _count: { id: true },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
    });

    expect(mocks.listConversations).toHaveBeenCalledWith({
      userId: "1",
      workspaceId: "ws-1",
      limit: 5,
    });
  });

  it("renders a useful empty dashboard state for users with no conversations", async () => {
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Signed in as Test User");
    expect(markup).toContain("Workspace 1");
    expect(markup).toContain("Start Guidance");
    expect(markup).toContain("You have no recent conversations");
    expect(markup).not.toContain("Reviewer Portal");
  });

  it("renders only current-user recent conversations returned by the ownership helper", async () => {
    mocks.listConversations.mockResolvedValueOnce([
      {
        id: "conv-1",
        title: "Private guidance",
        metadata: { personaId: "krishna" },
        messages: [{ content: "A private first message" }],
      },
    ]);

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("Private guidance");
    expect(markup).toContain("A private first message");
    expect(markup).toContain("/chat?conversationId=conv-1");
    expect(markup).not.toContain("other-user");
    expect(mocks.listConversations).toHaveBeenCalledWith({
      userId: "1",
      workspaceId: "ws-1",
      limit: 5,
    });
  });

  it("shows reviewer navigation only for authorized reviewers", async () => {
    mocks.isReviewerAuthorized.mockReturnValueOnce(true);

    const reviewerMarkup = renderToStaticMarkup(await DashboardPage());
    expect(reviewerMarkup).toContain("Reviewer Portal");
    expect(reviewerMarkup).toContain("/admin/scripture-reviews");

    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "1" } });
    mocks.userFindUnique.mockResolvedValue({
      id: "1",
      email: "test@example.com",
      name: "Test User",
    });
    mocks.ensureDefaultWorkspace.mockResolvedValue({
      id: "ws-1",
      name: "Workspace 1",
      slug: "ws-1",
    });
    mocks.isReviewerAuthorized.mockReturnValue(false);
    mocks.usageEventAggregate.mockResolvedValue({
      _count: { id: 0 },
      _sum: { totalTokens: null, inputTokens: null, outputTokens: null },
    });
    mocks.listConversations.mockResolvedValue([]);

    const ordinaryMarkup = renderToStaticMarkup(await DashboardPage());
    expect(ordinaryMarkup).not.toContain("Reviewer Portal");
  });
});
