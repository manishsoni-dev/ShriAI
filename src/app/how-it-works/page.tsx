import Link from "next/link";

import {
  PageShell,
  SacredPanel,
  SectionHeader,
  SectionLabel,
} from "@/app/_components/devotional-shell";

const steps = [
  [
    "Choose a persona",
    "Select Rama, Krishna, Shiva, Hanuman, Sita, or Radha based on the emotional and practical nature of the moment.",
  ],
  [
    "Speak or type",
    "Share the problem plainly. Browser speech input is available where supported, and text input always works.",
  ],
  [
    "Retrieve wisdom context",
    "When documents are uploaded to the knowledge base, Shri AI retrieves relevant excerpts before responding.",
  ],
  [
    "Receive grounded guidance",
    "The response streams into the chat with persona-specific tone, practical next steps, and respectful limitations.",
  ],
  [
    "Listen if helpful",
    "Optional browser voice output can read the answer while the ambient OM tone stays under user control.",
  ],
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeader
          body="The experience is built for calm reflection: choose a sacred lens, share the situation, and receive practical guidance supported by your wisdom library."
          eyebrow="How it works"
          title="From confusion to a steadier next step"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {steps.map(([title, body], index) => (
            <article
              className="rounded-lg border border-amber-200/12 bg-[#120c08]/72 p-5"
              key={title}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/65">
                Step {index + 1}
              </p>
              <h2 className="mt-4 font-serif text-2xl font-semibold text-amber-50">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-100/65">{body}</p>
            </article>
          ))}
        </div>
        <SacredPanel>
          <div className="mt-12 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <SectionLabel>Begin</SectionLabel>
              <h2 className="mt-3 font-serif text-3xl font-semibold">
                Enter the live guidance space
              </h2>
            </div>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-6 text-sm font-semibold text-[#170d05] shadow-[0_0_28px_rgba(245,158,11,0.22)]"
              href="/chat"
            >
              Start Guidance
            </Link>
          </div>
        </SacredPanel>
      </section>
    </PageShell>
  );
}
