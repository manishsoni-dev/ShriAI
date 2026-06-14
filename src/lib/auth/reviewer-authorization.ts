import "server-only";

export type ReviewerRole = "admin" | "reviewer";

export type ReviewerPrincipal = {
  id: string;
  email: string;
  role: ReviewerRole;
};

function parseEmailList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getReviewerPrincipal(user: {
  id: string;
  email: string | null;
}): ReviewerPrincipal | null {
  if (!user.email) return null;

  const email = user.email.toLowerCase();
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const reviewerEmails = parseEmailList(process.env.REVIEWER_EMAILS);

  if (adminEmails.has(email)) {
    return { id: user.id, email, role: "admin" };
  }

  if (reviewerEmails.has(email)) {
    return { id: user.id, email, role: "reviewer" };
  }

  return null;
}

export function isReviewerAuthorized(user: {
  id: string;
  email: string | null;
}) {
  return getReviewerPrincipal(user) !== null;
}
