import { PageShell, SectionHeader } from "@/app/_components/devotional-shell";

const features = [
  [
    "Six divine personas",
    "Distinct guidance lenses for ethics, strategy, silence, service, resilience, and love.",
  ],
  [
    "Streaming AI chat",
    "Responses arrive progressively with a calm divine-light reveal.",
  ],
  [
    "Scripture-aware RAG",
    "Uploaded wisdom texts can ground responses through semantic retrieval.",
  ],
  [
    "Speech input",
    "Browser mic support lets users speak when typing feels too small.",
  ],
  [
    "Voice output",
    "Optional browser voice reads answers aloud where supported.",
  ],
  [
    "Ambient controls",
    "Meditative OM tone, toggle state, and vertical volume control.",
  ],
  ["Protected history", "Authenticated conversations persist by workspace."],
  [
    "Usage visibility",
    "The dashboard keeps request and token usage observable.",
  ],
  [
    "Respectful guardrails",
    "Clear positioning as reflection support, not divine authority or guru replacement.",
  ],
];

export default function FeaturesPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeader
          body="Shri AI pairs a cinematic devotional interface with production-grade assistant foundations already present in the app."
          eyebrow="Features"
          title="Spiritual depth with modern product discipline"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map(([title, body]) => (
            <article
              className="rounded-lg border border-amber-200/12 bg-[#120c08]/72 p-6"
              key={title}
            >
              <h2 className="font-serif text-2xl font-semibold text-amber-50">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-100/65">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
