import {
  PageShell,
  SacredPanel,
  SectionHeader,
  SectionLabel,
} from "@/app/_components/devotional-shell";
import { WaitlistForm } from "@/app/_components/waitlist-form";

export default function ContactPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:grid-cols-[1fr_460px] md:px-8">
        <div>
          <SectionHeader
            body="Join the waitlist, share feedback, or tell us which persona and workflow would matter most in your devotional guidance practice."
            eyebrow="Contact"
            title="Join the Shri AI circle"
          />
          <SacredPanel>
            <div className="mt-12">
              <SectionLabel>Presence</SectionLabel>
              <h2 className="mt-4 font-serif text-3xl font-semibold">
                Built for calm, clarity, and reverence
              </h2>
              <p className="mt-3 text-base leading-8 text-amber-100/68">
                Every message helps shape an experience that is more respectful,
                more emotionally intelligent, and more useful for seekers.
              </p>
            </div>
          </SacredPanel>
        </div>
        <SacredPanel>
          <SectionLabel>Message</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-semibold">
            Send a note
          </h2>
          <div className="mt-5">
            <WaitlistForm
              buttonLabel="Send and join"
              showMessage
              source="contact"
            />
          </div>
        </SacredPanel>
      </section>
    </PageShell>
  );
}
