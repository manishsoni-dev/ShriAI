export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#171717]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#08766f]">
            Shri AI
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
            A calm workspace for capable AI assistance.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#625d54]">
            The foundation is ready for authenticated assistants, shared
            workspaces, and production data flows backed by PostgreSQL.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-[#2f3f3d]"
              href="/chat"
            >
              Open chat
            </a>
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-black/15 bg-white px-5 text-sm font-medium text-[#171717] transition hover:bg-[#eef3f1]"
              href="https://nextjs.org/docs"
              rel="noreferrer"
              target="_blank"
            >
              Next.js docs
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            ["Stack", "Next.js, TypeScript, Tailwind, Prisma"],
            ["Data", "PostgreSQL schema for users and workspaces"],
            ["Guardrails", "Strict types, linting, and env validation"],
          ].map(([title, body]) => (
            <article
              className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5"
              key={title}
            >
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#625d54]">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
