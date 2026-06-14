import Link from "next/link";

import { submitScriptureReviewAction } from "@/app/admin/scripture-reviews/actions";
import { getReviewCoverage } from "@/lib/scripture-review/coverage";
import {
  getScriptureReviewAuditHistory,
  getScriptureReviewDetail,
  listScriptureReviews,
  requireReviewerForPage,
} from "@/lib/scripture-review/reviews";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorMessage(code: string | undefined) {
  if (!code) return null;
  const messages: Record<string, string> = {
    stale_version:
      "This review changed after you loaded it. Reload and try again.",
    missing_rejection_reason: "Rejection requires a reason.",
    missing_needs_changes_notes:
      "Requesting changes requires actionable notes.",
    missing_voice_approval_fields:
      "Voice approval requires an accuracy score and reviewer notes.",
    unauthorized_reviewer: "Reviewer access is required.",
    malformed_input: "The submitted review form was malformed.",
    database_mutation_failed: "The review update failed.",
  };
  return messages[code] ?? "The review action failed.";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#08766f]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string | string[] | null;
}) {
  const rendered = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#08766f]">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#263331]">
        {rendered || "Not set"}
      </p>
    </div>
  );
}

export default async function ScriptureReviewsPage(props: PageProps) {
  const access = await requireReviewerForPage();

  if (!access.principal) {
    return (
      <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#171717]">
        <section className="mx-auto w-full max-w-4xl rounded-md border border-red-200 bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-red-700">
            Forbidden
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Reviewer access is required.
          </h1>
          <p className="mt-2 text-sm text-[#43514f]">
            Ask an administrator to add your email to REVIEWER_EMAILS or
            ADMIN_EMAILS.
          </p>
        </section>
      </main>
    );
  }

  const searchParams = (await props.searchParams) ?? {};
  const filters = {
    status: firstValue(searchParams.status),
    source: firstValue(searchParams.source),
    chapter: firstValue(searchParams.chapter),
    q: firstValue(searchParams.q),
    approvedForVoice: firstValue(searchParams.approvedForVoice),
    page: firstValue(searchParams.page),
  };
  const selectedReviewId = firstValue(searchParams.reviewId);
  const [reviews, coverage] = await Promise.all([
    listScriptureReviews(filters),
    getReviewCoverage(),
  ]);

  const selected =
    selectedReviewId &&
    (await getScriptureReviewDetail(selectedReviewId).catch(() => null));
  const audit =
    selectedReviewId && selected
      ? await getScriptureReviewAuditHistory(selectedReviewId)
      : [];
  const message = errorMessage(firstValue(searchParams.error));
  const updated = firstValue(searchParams.result) === "updated";

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="border-b border-black/10 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
            Admin
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Scripture Reviews
              </h1>
              <p className="mt-2 text-sm text-[#43514f]">
                Signed in as {access.user.email}. Role: {access.principal.role}.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {message ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {message}
          </div>
        ) : null}
        {updated ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Review updated.
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <Stat label="Total chunks" value={coverage.totalChunks} />
          <Stat label="Pending" value={coverage.pending} />
          <Stat label="Approved voice" value={coverage.approvedForVoice} />
          <Stat
            label="Voice coverage"
            value={`${coverage.voiceApprovedPercentage}%`}
          />
        </section>

        <form className="grid gap-3 rounded-md border border-black/10 bg-white p-4 md:grid-cols-6">
          <select
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
            defaultValue={filters.status ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_changes">Needs changes</option>
          </select>
          <select
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
            defaultValue={filters.source ?? ""}
            name="source"
          >
            <option value="">All sources</option>
            {reviews.sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
            defaultValue={filters.chapter ?? ""}
            min="1"
            name="chapter"
            placeholder="Chapter"
            type="number"
          />
          <input
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Reference search"
          />
          <select
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
            defaultValue={filters.approvedForVoice ?? ""}
            name="approvedForVoice"
          >
            <option value="">Voice approval</option>
            <option value="true">Approved</option>
            <option value="false">Not approved</option>
          </select>
          <button
            className="h-10 rounded-md bg-[#171717] px-4 text-sm font-medium text-white"
            type="submit"
          >
            Filter
          </button>
        </form>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-[#43514f]">
              <span>
                {reviews.total} reviews, page {reviews.page} of{" "}
                {reviews.pageCount}
              </span>
              <span>
                Pending {reviews.counts.pending ?? 0} · Approved{" "}
                {reviews.counts.approved ?? 0} · Rejected{" "}
                {reviews.counts.rejected ?? 0} · Needs changes{" "}
                {reviews.counts.needs_changes ?? 0}
              </span>
            </div>

            {reviews.items.map((review) => (
              <article
                className="rounded-md border border-black/10 bg-white p-5"
                key={review.id}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#08766f]">
                      {review.chunk.source.canonicalTitle}{" "}
                      {review.chunk.canonicalRef}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {review.reviewStatus} · voice{" "}
                      {review.approvedForVoice ? "approved" : "not approved"}
                    </h2>
                  </div>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-medium"
                    href={`/admin/scripture-reviews?reviewId=${review.id}`}
                  >
                    Open detail
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextBlock
                    label="Original Sanskrit"
                    value={review.chunk.originalText}
                  />
                  <TextBlock
                    label="Transliteration"
                    value={review.chunk.transliteration}
                  />
                  <TextBlock
                    label="Translation"
                    value={review.chunk.translation}
                  />
                  <TextBlock
                    label="Commentary"
                    value={review.chunk.commentary}
                  />
                  <TextBlock
                    label="Practical note"
                    value={review.chunk.practicalNote}
                  />
                  <TextBlock
                    label="Persona tags"
                    value={review.chunk.personaTags}
                  />
                  <TextBlock
                    label="Theme tags"
                    value={review.chunk.themeTags}
                  />
                  <TextBlock
                    label="Emotion tags"
                    value={review.chunk.emotionTags}
                  />
                  <TextBlock
                    label="Answer use cases"
                    value={review.chunk.answerUseCases}
                  />
                  <TextBlock
                    label="Copyright"
                    value={review.chunk.source.copyrightStatus}
                  />
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-md border border-black/10 bg-white p-5">
            {selected ? (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#08766f]">
                    Review detail
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {selected.chunk.source.canonicalTitle}{" "}
                    {selected.chunk.canonicalRef}
                  </h2>
                  <p className="mt-1 text-sm text-[#43514f]">
                    Loaded version {selected.updatedAt.toISOString()}
                  </p>
                </div>

                <form
                  action={submitScriptureReviewAction}
                  className="flex flex-col gap-3"
                >
                  <input name="reviewId" type="hidden" value={selected.id} />
                  <input
                    name="updatedAt"
                    type="hidden"
                    value={selected.updatedAt.toISOString()}
                  />
                  <label className="text-sm font-medium">
                    Accuracy score
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-black/10 px-3"
                      defaultValue={selected.accuracyScore ?? ""}
                      max="5"
                      min="1"
                      name="accuracyScore"
                      type="number"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Reviewer notes
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-md border border-black/10 p-3"
                      defaultValue={selected.interpretationNotes ?? ""}
                      name="interpretationNotes"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Rejection reason
                    <textarea
                      className="mt-1 min-h-20 w-full rounded-md border border-black/10 p-3"
                      defaultValue={selected.rejectionReason ?? ""}
                      name="rejectionReason"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-medium"
                      name="action"
                      type="submit"
                      value="approve_text"
                    >
                      Approve for text only
                    </button>
                    <button
                      className="h-10 rounded-md bg-[#171717] px-3 text-sm font-medium text-white"
                      name="action"
                      type="submit"
                      value="approve_voice"
                    >
                      Approve for voice
                    </button>
                    <button
                      className="h-10 rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900"
                      name="action"
                      type="submit"
                      value="needs_changes"
                    >
                      Request changes
                    </button>
                    <button
                      className="h-10 rounded-md border border-red-300 bg-red-50 px-3 text-sm font-medium text-red-900"
                      name="action"
                      type="submit"
                      value="reject"
                    >
                      Reject
                    </button>
                  </div>
                </form>

                <div>
                  <h3 className="text-sm font-semibold">Audit history</h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {audit.length === 0 ? (
                      <p className="text-sm text-[#43514f]">No audit events.</p>
                    ) : (
                      audit.map((event) => (
                        <div
                          className="rounded-md border border-black/10 p-3 text-sm"
                          key={event.id}
                        >
                          <p className="font-medium">
                            {event.previousStatus ?? "none"} →{" "}
                            {event.nextStatus}; voice{" "}
                            {String(event.previousApprovedForVoice)} →{" "}
                            {String(event.nextApprovedForVoice)}
                          </p>
                          <p className="mt-1 text-[#43514f]">
                            Reviewer {event.reviewerUserId} ·{" "}
                            {event.createdAt.toISOString()}
                          </p>
                          {event.notes ? (
                            <p className="mt-2 text-[#263331]">{event.notes}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#43514f]">
                Select a review to inspect details and record a decision.
              </p>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}
