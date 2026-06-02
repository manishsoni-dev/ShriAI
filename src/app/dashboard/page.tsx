import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { signOutAction } from "@/app/dashboard/actions";
import { db } from "@/lib/db";
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
  const usage = await db.usageEvent.aggregate({
    where: {
      workspaceId: workspace.id,
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
  });

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
              Shri AI
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#43514f]">
              Signed in as {user.name ? `${user.name} ` : ""}
              <span className="font-medium text-[#171717]">{user.email}</span>
            </p>
          </div>
          <form action={signOutAction}>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-[#171717] shadow-sm transition hover:bg-[#eef3f1]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#08766f]">
            Current workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h2>
          <p className="mt-2 text-sm text-[#43514f]">/{workspace.slug}</p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2f3f3d]"
            href="/chat"
          >
            Open chat
          </Link>
          <Link
            className="ml-3 mt-5 inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-[#171717] transition hover:bg-[#eef3f1]"
            href="/knowledge"
          >
            Knowledge
          </Link>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#08766f]">
            AI usage
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {usage._count.id} requests
          </h2>
          <p className="mt-2 text-sm text-[#43514f]">
            {usage._sum.totalTokens ?? 0} estimated tokens in the last 7 days
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-black/10 bg-[#f5f7f6] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#08766f]">
                Input
              </p>
              <p className="mt-1 font-semibold">
                {usage._sum.inputTokens ?? 0}
              </p>
            </div>
            <div className="rounded-md border border-black/10 bg-[#f5f7f6] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#08766f]">
                Output
              </p>
              <p className="mt-1 font-semibold">
                {usage._sum.outputTokens ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Assistants", "Knowledge", "Activity"].map((label) => (
            <article
              className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5"
              key={label}
            >
              <h2 className="text-base font-semibold">{label}</h2>
              <p className="mt-3 text-sm leading-6 text-[#43514f]">
                Placeholder area ready for the first authenticated Shri AI
                workflows.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
