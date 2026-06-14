import Link from "next/link";

import {
  PageShell,
  SacredPanel,
  SectionHeader,
  SectionLabel,
} from "@/app/_components/devotional-shell";

const themes = [
  ["Dharma", "Ethical clarity, responsibility, promises, and right conduct."],
  ["Bhakti", "Devotion, surrender, longing, and love in action."],
  ["Jñāna", "Self-inquiry, detachment, silence, and discernment."],
  ["Seva", "Service, discipline, courage, and embodied devotion."],
  ["Shakti", "Resilience, dignity, inner strength, and emotional steadiness."],
  ["Prema", "Tenderness, divine love, heartbreak, and emotional truth."],
];

export default function WisdomPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeader
          body="The Wisdom Library is the scripture and reflection layer behind Shri AI. Upload supported documents into the protected knowledge base, then let chat retrieve relevant excerpts when you ask."
          eyebrow="Wisdom library"
          title="A living knowledge base for sacred reflection"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {themes.map(([title, body]) => (
            <article
              className="rounded-lg border border-amber-200/12 bg-[#120c08]/72 p-6"
              key={title}
            >
              <h2 className="font-serif text-3xl font-semibold text-amber-50">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-100/65">{body}</p>
            </article>
          ))}
        </div>
        <SacredPanel>
          <div className="mt-12 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <SectionLabel>Knowledge base</SectionLabel>
              <h2 className="mt-3 font-serif text-3xl font-semibold">
                Upload and search your texts
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-100/65">
                The existing protected document flow supports PDF, TXT,
                Markdown, and DOCX files with chunking, embeddings, and semantic
                search.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-5 text-sm font-semibold text-[#170d05]"
                href="/knowledge"
              >
                Open Library
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md border border-amber-200/18 px-5 text-sm font-semibold text-amber-50"
                href="/knowledge/search"
              >
                Search Wisdom
              </Link>
            </div>
          </div>
        </SacredPanel>
      </section>
    </PageShell>
  );
}
