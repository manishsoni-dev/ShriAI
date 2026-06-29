import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser as auth } from "@/lib/auth/get-authenticated-user";
import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/knowledge-search";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

type KnowledgeSearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function KnowledgeSearchPage({
  searchParams,
}: KnowledgeSearchPageProps) {
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
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query
    ? await semanticSearch({
        userId: user.id,
        workspaceId: workspace.id,
        query,
        topK: 8,
      })
    : [];

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-4 py-6 text-[#171717] md:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
              Shri AI
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Knowledge search
            </h1>
            <p className="mt-2 text-sm text-[#43514f]">
              Debug semantic retrieval against embedded workspace chunks.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition hover:bg-[#eef3f1]"
            href="/knowledge"
          >
            Documents
          </Link>
        </header>

        <form className="rounded-md border border-black/10 bg-white p-4 shadow-sm shadow-[#0f766e]/5">
          <label className="block text-sm font-medium text-[#2f3f3d]">
            Search query
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-11 flex-1 rounded-md border border-black/10 bg-[#f5f7f6] px-3 text-sm outline-none transition focus:border-[#08766f] focus:ring-2 focus:ring-[#08766f]/15"
              defaultValue={query}
              name="q"
              placeholder="Ask about uploaded documents..."
              type="search"
            />
            <button
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-[#2f3f3d]"
              type="submit"
            >
              Search
            </button>
          </div>
        </form>

        {!query ? (
          <div className="rounded-md border border-dashed border-black/15 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold tracking-tight">
              Search your knowledge base
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#43514f]">
              Enter a question to embed it and compare it against workspace
              document chunks.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-md border border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold tracking-tight">
              No chunks found
            </h2>
            <p className="mt-2 text-sm text-[#43514f]">
              Upload and ingest documents before searching.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((result) => (
              <article
                className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5"
                key={result.id}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold">{result.documentName}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#08766f]">
                      Chunk {result.chunkIndex}
                    </p>
                  </div>
                  <span className="rounded-md border border-black/10 bg-[#f5f7f6] px-3 py-2 text-sm font-medium">
                    Score {Number(result.score).toFixed(3)}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#43514f]">
                  {result.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
