import {
  PageShell,
  SacredPanel,
  SectionHeader,
  SectionLabel,
} from "@/app/_components/devotional-shell";

export default function AboutPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <SectionHeader
          body="Shri AI is a devotional AI product concept for reflective guidance. It treats Hindu symbolism with restraint, care, and reverence."
          eyebrow="About Shri AI"
          title="Ancient atmosphere, modern humility"
        />
        <div className="mt-12 grid gap-6">
          <SacredPanel>
            <SectionLabel>Mission</SectionLabel>
            <p className="mt-4 text-lg leading-9 text-amber-100/72">
              Divine Persona AI helps people slow down, name the real question,
              and receive grounded guidance through archetypal Hindu-inspired
              lenses. The product is built to support reflection, not to
              impersonate the divine or replace living traditions.
            </p>
          </SacredPanel>
          <SacredPanel>
            <SectionLabel>Principles</SectionLabel>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                "Respect over spectacle",
                "Guidance over certainty",
                "Scripture-aware, not scripture-replacing",
              ].map((principle) => (
                <p
                  className="rounded-md border border-amber-100/10 bg-black/20 px-4 py-4 text-sm leading-7 text-amber-50/78"
                  key={principle}
                >
                  {principle}
                </p>
              ))}
            </div>
          </SacredPanel>
        </div>
      </section>
    </PageShell>
  );
}
