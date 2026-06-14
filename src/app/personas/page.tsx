import {
  PageShell,
  PersonasGrid,
  SectionHeader,
} from "@/app/_components/devotional-shell";

export default function PersonasPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeader
          body="Each persona is a respectful guidance lens with a distinct emotional texture, practical domain, and spiritual vocabulary."
          eyebrow="Persona selection"
          title="Six paths into one reflective space"
        />
        <div className="mt-12">
          <PersonasGrid detailed />
        </div>
      </section>
    </PageShell>
  );
}
