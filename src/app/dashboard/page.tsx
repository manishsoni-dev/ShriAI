import { redirect } from "next/navigation";
import Link from "next/link";

import { getAuthenticatedUser as auth } from "@/lib/auth/get-authenticated-user";
import { signOutAction } from "@/app/dashboard/actions";
import { isReviewerAuthorized } from "@/lib/auth/reviewer-authorization";
import { listConversations } from "@/lib/conversations";
import { db } from "@/lib/db";
import { getPersonaFromMetadata } from "@/lib/personas";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

function getUsageWindowStart() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const workspace = await ensureDefaultWorkspace(user);
  const since = getUsageWindowStart();
  const isReviewer = isReviewerAuthorized(user);

  const [usage, conversations] = await Promise.all([
    db.usageEvent.aggregate({
      where: {
        workspaceId: workspace.id,
        userId: user.id,
        createdAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
    }),
    listConversations({
      userId: user.id,
      workspaceId: workspace.id,
      limit: 5,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--page-surface)] px-6 py-8 text-amber-50">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-amber-200/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
              Shri AI
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-amber-100/68">
              Signed in as {user.name ? `${user.name} ` : ""}
              <span className="font-medium text-amber-50">{user.email}</span>
            </p>
          </div>
          <form action={signOutAction}>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-amber-200/20 bg-transparent px-4 text-sm font-medium text-amber-50 shadow-sm transition hover:bg-amber-200/10"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-amber-200/12 bg-[var(--card-surface)] p-5 shadow-[0_20px_90px_rgba(0,0,0,0.3)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
            Current workspace
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h2>
          <p className="mt-2 text-sm text-amber-100/68">/{workspace.slug}</p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-semibold text-[#170d05] shadow-[0_0_26px_rgba(245,158,11,0.24)] transition hover:brightness-110"
            href="/chat"
          >
            Start Guidance
          </Link>
          <Link
            className="ml-3 mt-5 inline-flex h-10 items-center justify-center rounded-md border border-amber-200/20 bg-transparent px-4 text-sm font-medium text-amber-50 transition hover:bg-amber-200/10"
            href="/knowledge"
          >
            Knowledge
          </Link>
          {isReviewer ? (
            <Link
              className="ml-3 mt-5 inline-flex h-10 items-center justify-center rounded-md border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
              href="/admin/scripture-reviews"
            >
              Reviewer Portal
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-amber-200/12 bg-[var(--card-surface)] p-5 shadow-[0_20px_90px_rgba(0,0,0,0.3)] backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
                Recent Conversations
              </p>
              <Link
                className="text-sm font-medium text-amber-300 hover:text-amber-200"
                href="/chat"
              >
                View all
              </Link>
            </div>
            {conversations.length === 0 ? (
              <p className="mt-6 text-sm text-amber-100/68">
                You have no recent conversations. Start a new session to begin
                guidance.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {conversations.map((conv) => {
                  const persona = getPersonaFromMetadata(conv.metadata);
                  return (
                    <li key={conv.id}>
                      <Link
                        className="block rounded-md border border-amber-200/10 bg-[#1a1310] p-3 transition hover:border-amber-200/30 hover:bg-[#201814]"
                        href={`/chat?conversationId=${conv.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-amber-50 truncate pr-4">
                            {conv.title || "Untitled conversation"}
                          </h3>
                          <span className="shrink-0 text-xs text-amber-200/50">
                            {persona.displayName}
                          </span>
                        </div>
                        {conv.messages.length > 0 ? (
                          <p className="mt-1 truncate text-xs text-amber-100/50">
                            {conv.messages[0].content}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-amber-200/12 bg-[var(--card-surface)] p-5 shadow-[0_20px_90px_rgba(0,0,0,0.3)] backdrop-blur h-fit">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
              Your AI usage
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
              {usage._count.id} requests
            </h2>
            <p className="mt-2 text-sm text-amber-100/68">
              {usage._sum.totalTokens ?? 0} estimated tokens in the last 7 days
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-amber-200/10 bg-[#1a1310] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-200/50">
                  Input
                </p>
                <p className="mt-1 font-semibold">
                  {usage._sum.inputTokens ?? 0}
                </p>
              </div>
              <div className="rounded-md border border-amber-200/10 bg-[#1a1310] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-200/50">
                  Output
                </p>
                <p className="mt-1 font-semibold">
                  {usage._sum.outputTokens ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
