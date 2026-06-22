import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Auth mock — default: valid reviewer session ───────────────────────────────
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "reviewer-user" } }),
}));

// ── DB mock fixtures ─────────────────────────────────────────────────────────
const tx = {
  scriptureChunkReview: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  scriptureChunkReviewAudit: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "reviewer-user",
        email: "reviewer@example.com",
        name: "Reviewer",
      }),
    },
    $transaction: vi.fn((callback) => callback(tx)),
  },
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  mutateScriptureReview,
  ReviewServiceError,
} from "@/lib/scripture-review/reviews";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReview(overrides?: object) {
  return {
    id: "review-1",
    chunkId: "chunk-1",
    reviewStatus: "pending" as const,
    approvedForVoice: false,
    updatedAt: new Date("2026-06-12T10:00:00.000Z"),
    ...overrides,
  };
}

describe("mutateScriptureReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to valid reviewer email before every test
    vi.stubEnv("REVIEWER_EMAILS", "reviewer@example.com");
    vi.stubEnv("ADMIN_EMAILS", "");
    // Reset db.user.findUnique to return the reviewer
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "reviewer-user",
      email: "reviewer@example.com",
      name: "Reviewer",
      passwordHash: "x",
      imageUrl: null,
      languagePreference: "auto",
      microphoneConsentGivenAt: null,
      microphoneConsentVersion: null,
      onboardedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it("throws unauthenticated (401) when there is no active session", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date().toISOString(),
        action: "approve_text",
      }),
    ).rejects.toMatchObject({
      code: "unauthenticated",
      status: 401,
    } satisfies Partial<ReviewServiceError>);
  });

  it("throws unauthorized_reviewer (403) when authenticated user is not a reviewer or admin", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "other-user" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "other-user",
      email: "random@example.com",
      name: "Random User",
      passwordHash: "x",
      imageUrl: null,
      languagePreference: "auto",
      microphoneConsentGivenAt: null,
      microphoneConsentVersion: null,
      onboardedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // random@example.com is NOT in REVIEWER_EMAILS or ADMIN_EMAILS
    vi.stubEnv("REVIEWER_EMAILS", "reviewer@example.com");
    vi.stubEnv("ADMIN_EMAILS", "");

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date().toISOString(),
        action: "approve_text",
      }),
    ).rejects.toMatchObject({
      code: "unauthorized_reviewer",
      status: 403,
    } satisfies Partial<ReviewServiceError>);
  });

  // ── Schema validation ────────────────────────────────────────────────────────

  it("throws malformed_input (400) when input fails schema validation", async () => {
    await expect(
      mutateScriptureReview({
        reviewId: "",
        updatedAt: "not-a-date",
        action: "approve_text",
      } as unknown as Parameters<typeof mutateScriptureReview>[0]),
    ).rejects.toMatchObject({
      code: "malformed_input",
      status: 400,
    } satisfies Partial<ReviewServiceError>);
  });

  it("throws malformed_input (400) when input is completely empty", async () => {
    await expect(
      mutateScriptureReview(
        {} as unknown as Parameters<typeof mutateScriptureReview>[0],
      ),
    ).rejects.toMatchObject({
      code: "malformed_input",
      status: 400,
    } satisfies Partial<ReviewServiceError>);
  });

  // ── Missing review record ────────────────────────────────────────────────────

  it("throws missing_review (404) when the review row does not exist", async () => {
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(null);

    await expect(
      mutateScriptureReview({
        reviewId: "nonexistent-review",
        updatedAt: new Date().toISOString(),
        action: "approve_text",
      }),
    ).rejects.toMatchObject({
      code: "missing_review",
      status: 404,
    } satisfies Partial<ReviewServiceError>);

    expect(tx.scriptureChunkReviewAudit.create).not.toHaveBeenCalled();
  });

  // ── Policy violations ────────────────────────────────────────────────────────

  it("throws missing_voice_approval_fields (400) when approving for voice without accuracy score and notes", async () => {
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(makeReview());

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date("2026-06-12T10:00:00.000Z").toISOString(),
        action: "approve_voice",
        // accuracyScore and interpretationNotes deliberately omitted
      }),
    ).rejects.toMatchObject({
      code: "missing_voice_approval_fields",
      status: 400,
    } satisfies Partial<ReviewServiceError>);

    expect(tx.scriptureChunkReview.updateMany).not.toHaveBeenCalled();
    expect(tx.scriptureChunkReviewAudit.create).not.toHaveBeenCalled();
  });

  it("throws missing_rejection_reason (400) when rejecting without a reason", async () => {
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(makeReview());

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date("2026-06-12T10:00:00.000Z").toISOString(),
        action: "reject",
        // rejectionReason deliberately omitted
      }),
    ).rejects.toMatchObject({
      code: "missing_rejection_reason",
      status: 400,
    } satisfies Partial<ReviewServiceError>);

    expect(tx.scriptureChunkReview.updateMany).not.toHaveBeenCalled();
    expect(tx.scriptureChunkReviewAudit.create).not.toHaveBeenCalled();
  });

  it("throws missing_needs_changes_notes (400) when requesting changes without actionable notes", async () => {
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(makeReview());

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date("2026-06-12T10:00:00.000Z").toISOString(),
        action: "needs_changes",
        // interpretationNotes deliberately omitted
      }),
    ).rejects.toMatchObject({
      code: "missing_needs_changes_notes",
      status: 400,
    } satisfies Partial<ReviewServiceError>);

    expect(tx.scriptureChunkReview.updateMany).not.toHaveBeenCalled();
    expect(tx.scriptureChunkReviewAudit.create).not.toHaveBeenCalled();
  });

  // ── Optimistic concurrency ───────────────────────────────────────────────────

  it("throws stale_version (409) when concurrent edit is detected", async () => {
    const updatedAt = new Date("2026-06-12T10:00:00.000Z");
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(
      makeReview({ updatedAt }),
    );
    tx.scriptureChunkReview.updateMany.mockResolvedValueOnce({ count: 0 }); // 0 rows = stale

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: updatedAt.toISOString(),
        action: "approve_text",
      }),
    ).rejects.toMatchObject({
      code: "stale_version",
      status: 409,
    } satisfies Partial<ReviewServiceError>);

    expect(tx.scriptureChunkReviewAudit.create).not.toHaveBeenCalled();
  });

  // ── Success paths ────────────────────────────────────────────────────────────

  it("approve_voice: sets reviewStatus=approved, approvedForVoice=true, and writes audit record", async () => {
    const updatedAt = new Date("2026-06-12T10:00:00.000Z");
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(
      makeReview({ updatedAt }),
    );
    tx.scriptureChunkReview.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.scriptureChunkReview.findUniqueOrThrow.mockResolvedValueOnce({
      id: "review-1",
    });

    await mutateScriptureReview({
      reviewId: "review-1",
      updatedAt: updatedAt.toISOString(),
      action: "approve_voice",
      accuracyScore: 5,
      interpretationNotes: "Reviewed and suitable for spoken guidance.",
    });

    expect(tx.scriptureChunkReview.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review-1", updatedAt },
        data: expect.objectContaining({
          reviewStatus: "approved",
          approvedForVoice: true,
          reviewedBy: "reviewer-user",
          reviewOrigin: "human",
        }),
      }),
    );
    expect(tx.scriptureChunkReviewAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reviewId: "review-1",
        scriptureChunkId: "chunk-1",
        previousStatus: "pending",
        nextStatus: "approved",
        nextApprovedForVoice: true,
        reviewerUserId: "reviewer-user",
      }),
    });
  });

  it("approve_text: sets reviewStatus=approved, approvedForVoice=false, and writes audit record", async () => {
    const updatedAt = new Date("2026-06-12T10:00:00.000Z");
    tx.scriptureChunkReview.findUnique.mockResolvedValueOnce(
      makeReview({ updatedAt }),
    );
    tx.scriptureChunkReview.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.scriptureChunkReview.findUniqueOrThrow.mockResolvedValueOnce({
      id: "review-1",
    });

    await mutateScriptureReview({
      reviewId: "review-1",
      updatedAt: updatedAt.toISOString(),
      action: "approve_text",
    });

    expect(tx.scriptureChunkReview.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewStatus: "approved",
          approvedForVoice: false,
        }),
      }),
    );
    // Audit record must be written even for approve_text
    expect(tx.scriptureChunkReviewAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextStatus: "approved",
          nextApprovedForVoice: false,
        }),
      }),
    );
  });

  // ── DB mutation failure ──────────────────────────────────────────────────────

  it("wraps unexpected DB transaction errors as database_mutation_failed (500)", async () => {
    vi.mocked(db.$transaction).mockRejectedValueOnce(
      new Error("DEADLOCK DETECTED"),
    );

    await expect(
      mutateScriptureReview({
        reviewId: "review-1",
        updatedAt: new Date().toISOString(),
        action: "approve_text",
      }),
    ).rejects.toMatchObject({
      code: "database_mutation_failed",
      status: 500,
    } satisfies Partial<ReviewServiceError>);
  });
});
