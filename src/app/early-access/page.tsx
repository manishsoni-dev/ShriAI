import {
  PageShell,
  SacredPanel,
  SectionHeader,
  SectionLabel,
} from "@/app/_components/devotional-shell";
import { WaitlistForm } from "@/app/_components/waitlist-form";

const tiers = [
  ["Seeker", "Personal reflection, persona chat, and early access updates."],
  [
    "Sadhana",
    "Voice, ambient controls, deeper history, and wisdom library workflows.",
  ],
  [
    "Sangha",
    "Shared workspace guidance, curated knowledge bases, and team access.",
  ],
];

export default function EarlyAccessPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:grid-cols-[1fr_420px] md:px-8">
        <div>
          <SectionHeader
            body="Pricing is forming around personal seekers, dedicated practitioners, and shared devotional workspaces. Join the list to shape the first release."
            eyebrow="Pricing and early access"
            title="Enter before the doors fully open"
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {tiers.map(([title, body]) => (
              <article
                className="rounded-lg border border-amber-200/12 bg-[#120c08]/72 p-6"
                key={title}
              >
                <h2 className="font-serif text-2xl font-semibold text-amber-50">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-amber-100/65">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
        <SacredPanel>
          <SectionLabel>Waitlist</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-semibold">
            Request early access
          </h2>
          <p className="mt-3 text-sm leading-7 text-amber-100/65">
            Share where Shri AI could support your reflective or devotional
            practice.
          </p>
          <div className="mt-5">
            <WaitlistForm source="early-access" />
          </div>
        </SacredPanel>
      </section>
    </PageShell>
  );
}
