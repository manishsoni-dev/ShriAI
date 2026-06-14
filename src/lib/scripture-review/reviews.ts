import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getReviewerPrincipal,
  type ReviewerPrincipal,
} from "@/lib/auth/reviewer-authorization";
import {
  buildReviewDecision,
  reviewMutationSchema,
  reviewStatusSchema,
  type ReviewStatus,
  type ReviewValidationErrorCode,
} from "@/lib/scripture-review/policy";

export type ReviewErrorCode =
  | "unauthenticated"
  | "unauthorized_reviewer"
  | "missing_review"
  | "stale_version"
  | "database_mutation_failed"
  | ReviewValidationErrorCode;

export class ReviewServiceError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ReviewServiceError";
  }
}

export type ReviewListFilters = {
  status?: string;
  source?: string;
  chapter?: string;
  q?: string;
  approvedForVoice?: string;
  page?: string;
};

const PAGE_SIZE = 20;

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });
}

export async function requireReviewer(): Promise<ReviewerPrincipal> {
  const user = await getCurrentUser();

  if (!user) {
    throw new ReviewServiceError(
      "unauthenticated",
      "Authentication is required.",
      401,
    );
  }

  const principal = getReviewerPrincipal(user);
  if (!principal) {
    throw new ReviewServiceError(
      "unauthorized_reviewer",
      "Reviewer access is required.",
      403,
    );
  }

  return principal;
}

export async function requireReviewerForPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return {
    user,
    principal: getReviewerPrincipal(user),
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseStatus(value: string | undefined): ReviewStatus | undefined {
  if (!value) return undefined;
  const parsed = reviewStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseVoiceFilter(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function chapterPrefix(chapter: string | undefined) {
  const parsed = parsePositiveInteger(chapter, 0);
  return parsed > 0 ? `${parsed}.` : undefined;
}

export async function listScriptureReviews(filters: ReviewListFilters) {
  await requireReviewer();

  const page = parsePositiveInteger(filters.page, 1);
  const status = parseStatus(filters.status);
  const approvedForVoice = parseVoiceFilter(filters.approvedForVoice);
  const source = filters.source?.trim();
  const refQuery = filters.q?.trim();
  const chapter = chapterPrefix(filters.chapter);
  const chunkAnd = [
    ...(refQuery
      ? [
          {
            canonicalRef: {
              contains: refQuery,
              mode: "insensitive" as const,
            },
          },
        ]
      : []),
    ...(chapter ? [{ canonicalRef: { startsWith: chapter } }] : []),
    ...(source
      ? [
          {
            source: {
              canonicalTitle: {
                contains: source,
                mode: "insensitive" as const,
              },
            },
          },
        ]
      : []),
  ];

  const where = {
    ...(status ? { reviewStatus: status } : {}),
    ...(approvedForVoice === undefined ? {} : { approvedForVoice }),
    ...(chunkAnd.length > 0 ? { chunk: { AND: chunkAnd } } : {}),
  };

  const [items, total, counts, sources] = await Promise.all([
    db.scriptureChunkReview.findMany({
      where,
      include: {
        chunk: {
          include: {
            source: true,
          },
        },
      },
      orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.scriptureChunkReview.count({ where }),
    db.scriptureChunkReview.groupBy({
      by: ["reviewStatus"],
      _count: { _all: true },
      orderBy: { reviewStatus: "asc" },
    }),
    db.scriptureSource.findMany({
      orderBy: { canonicalTitle: "asc" },
      select: { canonicalTitle: true },
    }),
  ]);

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: Object.fromEntries(
      counts.map((count) => [count.reviewStatus, count._count._all]),
    ) as Partial<Record<ReviewStatus, number>>,
    sources: sources.map((item) => item.canonicalTitle),
  };
}

export async function getScriptureReviewDetail(reviewId: string) {
  await requireReviewer();

  const review = await db.scriptureChunkReview.findUnique({
    where: { id: reviewId },
    include: {
      chunk: {
        include: {
          source: true,
        },
      },
    },
  });

  if (!review) {
    throw new ReviewServiceError("missing_review", "Review not found.", 404);
  }

  return review;
}

export async function getScriptureReviewAuditHistory(reviewId: string) {
  await requireReviewer();

  const review = await db.scriptureChunkReview.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });

  if (!review) {
    throw new ReviewServiceError("missing_review", "Review not found.", 404);
  }

  return db.scriptureChunkReviewAudit.findMany({
    where: { reviewId },
    orderBy: { createdAt: "desc" },
  });
}

export async function mutateScriptureReview(rawInput: unknown) {
  const principal = await requireReviewer();
  const parsed = reviewMutationSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new ReviewServiceError(
      "malformed_input",
      "Review mutation input is malformed.",
      400,
    );
  }

  let decision;
  try {
    decision = buildReviewDecision(parsed.data);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw new ReviewServiceError(
        (error as { code: ReviewValidationErrorCode }).code,
        error.message,
        400,
      );
    }
    throw error;
  }

  const expectedUpdatedAt = new Date(parsed.data.updatedAt);
  const reviewedAt = new Date();

  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.scriptureChunkReview.findUnique({
        where: { id: parsed.data.reviewId },
        select: {
          id: true,
          chunkId: true,
          reviewStatus: true,
          approvedForVoice: true,
          updatedAt: true,
        },
      });

      if (!current) {
        throw new ReviewServiceError(
          "missing_review",
          "Review not found.",
          404,
        );
      }

      const updateResult = await tx.scriptureChunkReview.updateMany({
        where: {
          id: current.id,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          reviewStatus: decision.reviewStatus,
          approvedForVoice: decision.approvedForVoice,
          reviewedBy: principal.id,
          reviewedAt,
          accuracyScore: decision.accuracyScore,
          interpretationNotes: decision.interpretationNotes,
          rejectionReason: decision.rejectionReason,
        },
      });

      if (updateResult.count !== 1) {
        throw new ReviewServiceError(
          "stale_version",
          "This review changed after you loaded it. Reload before submitting.",
          409,
        );
      }

      await tx.scriptureChunkReviewAudit.create({
        data: {
          reviewId: current.id,
          scriptureChunkId: current.chunkId,
          previousStatus: current.reviewStatus,
          nextStatus: decision.reviewStatus,
          previousApprovedForVoice: current.approvedForVoice,
          nextApprovedForVoice: decision.approvedForVoice,
          reviewerUserId: principal.id,
          notes: decision.auditNotes,
        },
      });

      return tx.scriptureChunkReview.findUniqueOrThrow({
        where: { id: current.id },
        include: {
          chunk: {
            include: {
              source: true,
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof ReviewServiceError) throw error;

    throw new ReviewServiceError(
      "database_mutation_failed",
      error instanceof Error ? error.message : "Review mutation failed.",
      500,
    );
  }
}

export function reviewErrorPayload(error: unknown) {
  if (error instanceof ReviewServiceError) {
    return {
      ok: false as const,
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
      },
    };
  }

  return {
    ok: false as const,
    error: {
      code: "database_mutation_failed" as const,
      message: error instanceof Error ? error.message : "Unexpected error.",
      status: 500,
    },
  };
}
