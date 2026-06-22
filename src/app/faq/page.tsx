import { PageShell, SectionHeader } from "@/app/_components/devotional-shell";

const faqs = [
  [
    "Is Shri AI claiming to be a deity?",
    "No. Personas are respectful guidance frames inspired by devotional qualities. The app does not claim divine authority.",
  ],
  [
    "Does this replace scripture or a guru?",
    "No. Shri AI is for reflection and practical guidance. It should not replace scripture, gurus, elders, or qualified professionals.",
  ],
  [
    "How does scripture grounding work?",
    "Uploaded documents are chunked, embedded, searched semantically, and supplied as context when relevant.",
  ],
  [
    "Do voice or chat features call cloud AI services?",
    "No. Chat and embeddings use local Ollama. Voice input uses the private local faster-whisper service through the authenticated backend, and voice output uses browser SpeechSynthesis.",
  ],
  [
    "Can I use it for grief or emotional pain?",
    "Yes for reflection and support, but crisis, medical, or mental-health emergencies require qualified human help.",
  ],
  [
    "Is my chat protected?",
    "Chat is behind sign-in and persists by workspace. Production deployments should still review privacy, retention, and compliance settings.",
  ],
];

export default function FAQPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <SectionHeader
          body="Clear boundaries help the experience stay devotional, trustworthy, and emotionally safe."
          eyebrow="FAQ"
          title="Questions before entering"
        />
        <div className="mt-12 grid gap-4">
          {faqs.map(([question, answer]) => (
            <article
              className="rounded-lg border border-amber-200/12 bg-[#120c08]/72 p-6"
              key={question}
            >
              <h2 className="font-serif text-2xl font-semibold text-amber-50">
                {question}
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-100/66">
                {answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
