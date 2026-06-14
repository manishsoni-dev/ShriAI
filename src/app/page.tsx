import Image from "next/image";
import Link from "next/link";

import { CosmicOrbitEngine } from "@/app/_components/CosmicOrbitEngine";
import {
  PageShell,
  PersonasGrid,
  SacredPanel,
  SectionLabel,
} from "@/app/_components/devotional-shell";
import { WaitlistForm } from "@/app/_components/waitlist-form";

const guidanceSteps = [
  ["Text chat", "Write what you are facing in ordinary language."],
  ["Mic input", "Speak when reflection needs a more human rhythm."],
  [
    "Voice response",
    "Listen back through a calm browser voice when available.",
  ],
  [
    "Scripture-grounded RAG",
    "Uploaded wisdom texts can be retrieved and used as context without fabricating citations.",
  ],
];

const trustNotes = [
  "Respectful AI guidance, never divine authority.",
  "Not a replacement for scripture, gurus, elders, therapy, medicine, legal, or financial advice.",
  "Designed for reflection, emotional clarity, and practical next steps.",
];

export default function Home() {
  return (
    <PageShell>
      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_0.95fr] md:px-8">
        <CosmicOrbitEngine
          centerYRatio={0.38}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          opacity={0.62}
        />
        <div className="relative z-10">
          <SectionLabel>Divine Persona AI</SectionLabel>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] text-amber-50 md:text-7xl">
            Seek guidance through Dharma, Bhakti, Jñāna, and Seva
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-amber-100/70">
            Shri AI blends a sacred temple atmosphere with modern AI guidance,
            helping you reflect with six Hindu-inspired personas rooted in
            clarity, devotion, courage, silence, resilience, and love.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-6 text-sm font-semibold text-[#170d05] shadow-[0_0_34px_rgba(245,158,11,0.28)] transition hover:brightness-110"
              href="/chat"
            >
              Start Guidance
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md border border-amber-200/18 px-6 text-sm font-semibold text-amber-50 transition hover:border-amber-200/38 hover:bg-amber-100/8"
              href="/personas"
            >
              Explore Personas
            </Link>
          </div>
        </div>

        <div className="relative z-10 min-h-[34rem]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-72 w-72 rounded-full border border-amber-200/18 bg-amber-100/5 shadow-[0_0_120px_rgba(245,158,11,0.22)] md:h-96 md:w-96">
              <Image
                alt="Golden Shri AI mark inside a devotional mandala"
                className="object-contain p-8 drop-shadow-[0_0_40px_rgba(245,158,11,0.38)]"
                fill
                priority
                sizes="(min-width: 768px) 384px, 288px"
                src="/shri-mark.png"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel>Six guidance streams</SectionLabel>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-amber-50">
              Choose the presence your moment needs
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-amber-200 transition hover:text-amber-50"
            href="/personas"
          >
            View all persona details
          </Link>
        </div>
        <PersonasGrid />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <SacredPanel>
          <SectionLabel>Live guidance</SectionLabel>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight">
            A sacred chat space, not a generic bot window
          </h2>
          <p className="mt-4 text-base leading-8 text-amber-100/68">
            The product experience centers on persona selection, streaming
            reflection, optional speech, ambient sound, and scripture-aware
            context from your own uploaded wisdom library.
          </p>
        </SacredPanel>
        <div className="grid gap-4 sm:grid-cols-2">
          {guidanceSteps.map(([title, body]) => (
            <article
              className="rounded-lg border border-amber-200/12 bg-[#110b08]/72 p-5"
              key={title}
            >
              <h3 className="font-serif text-2xl font-semibold text-amber-50">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-amber-100/65">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <SacredPanel>
            <SectionLabel>Trust</SectionLabel>
            <h2 className="mt-4 font-serif text-4xl font-semibold">
              Reverent by design
            </h2>
            <div className="mt-6 grid gap-3">
              {trustNotes.map((note) => (
                <p
                  className="rounded-md border border-amber-100/10 bg-black/20 px-4 py-3 text-sm leading-7 text-amber-50/78"
                  key={note}
                >
                  {note}
                </p>
              ))}
            </div>
          </SacredPanel>
          <SacredPanel>
            <SectionLabel>Early access</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl font-semibold">
              Join the first circle
            </h2>
            <p className="mt-3 text-sm leading-7 text-amber-100/65">
              Get updates as the devotional chat, voice, and wisdom library
              experience opens.
            </p>
            <div className="mt-5">
              <WaitlistForm source="home" />
            </div>
          </SacredPanel>
        </div>
      </section>
    </PageShell>
  );
}
