import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { PersonaSymbol } from "@/app/_components/persona-symbol";
import { personas, type Persona } from "@/lib/personas";

type PersonaStyle = CSSProperties & {
  "--persona-color": string;
  "--persona-glow": string;
};

export const navItems = [
  ["Personas", "/personas"],
  ["How it works", "/how-it-works"],
  ["Wisdom", "/wisdom"],
  ["Features", "/features"],
  ["FAQ", "/faq"],
] as const;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/">
      <span
        className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-amber-200/25 bg-amber-100/5 shadow-[0_0_34px_rgba(245,178,66,0.22)] ${
          compact ? "h-10 w-10" : "h-12 w-12"
        }`}
      >
        <Image
          alt="Shri AI mark"
          className="object-contain p-1"
          fill
          priority={compact}
          sizes={compact ? "40px" : "48px"}
          src="/shri-mark.png"
          unoptimized
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-serif text-lg font-semibold tracking-wide text-amber-50">
          Shri AI
        </span>
        {!compact ? (
          <span className="block truncate text-xs uppercase tracking-[0.22em] text-amber-200/70">
            Divine Persona AI
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function MarketingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-amber-200/10 bg-[#080604]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 md:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm text-amber-100/72 lg:flex">
          {navItems.map(([label, href]) => (
            <Link
              className="transition hover:text-amber-100"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            className="hidden h-10 items-center justify-center rounded-md border border-amber-200/15 px-4 text-sm font-medium text-amber-100 transition hover:border-amber-200/35 hover:bg-amber-100/8 sm:inline-flex"
            href="/early-access"
          >
            Early access
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-semibold text-[#170d05] shadow-[0_0_26px_rgba(245,158,11,0.24)] transition hover:brightness-110"
            href="/chat"
          >
            Start Guidance
          </Link>
        </div>
      </div>
    </header>
  );
}

export function CosmicBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 devotional-cosmos" />
      <div className="absolute left-[8%] top-[18%] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute right-[6%] top-[24%] h-72 w-72 rounded-full bg-orange-500/12 blur-3xl" />
      <div className="absolute inset-0 particle-field" />
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070504] text-amber-50">
      <CosmicBackdrop />
      <MarketingNav />
      <div className="relative z-10 pt-20">{children}</div>
    </main>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <SectionLabel>{eyebrow}</SectionLabel>
      <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-amber-50 md:text-6xl">
        {title}
      </h1>
      <p className="mt-5 text-base leading-8 text-amber-100/68 md:text-lg">
        {body}
      </p>
    </div>
  );
}

export function PersonaGlyph({ persona }: { persona: Persona }) {
  return (
    <span
      className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--persona-color)]/35 bg-white/5 text-amber-50 shadow-[0_0_26px_var(--persona-glow)]"
      style={
        {
          "--persona-color": persona.color,
          "--persona-glow": persona.glow,
        } as PersonaStyle
      }
    >
      <PersonaSymbol
        className="h-8 w-8 opacity-25"
        personaId={persona.id}
        style={{ color: persona.color }}
      />
    </span>
  );
}

export function PersonaCard({
  persona,
  detailed = false,
}: {
  persona: Persona;
  detailed?: boolean;
}) {
  return (
    <article
      className="group relative overflow-hidden rounded-lg border border-amber-200/12 bg-[#130d0a]/72 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.26)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[color:var(--persona-color)]/45"
      style={
        {
          "--persona-color": persona.color,
          "--persona-glow": persona.glow,
        } as PersonaStyle
      }
    >
      <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-[color:var(--persona-color)]/14 blur-3xl transition group-hover:bg-[color:var(--persona-color)]/22" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <PersonaGlyph persona={persona} />
          <span className="rounded-full border border-amber-100/12 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100/62">
            {persona.domain}
          </span>
        </div>
        <h2 className="mt-5 font-serif text-2xl font-semibold text-amber-50">
          <span className="shri-prefix">
            {persona.displayName.split(" ")[0]}{" "}
          </span>
          {persona.displayName.split(" ").slice(1).join(" ")}
        </h2>
        <p className="mt-1 text-sm font-medium text-[color:var(--persona-color)]">
          {persona.title}
        </p>
        <p className="mt-4 text-sm leading-7 text-amber-100/68">
          {persona.useCase}
        </p>
        {detailed ? (
          <div className="mt-5 space-y-2">
            {persona.suggestedPrompts.map((prompt) => (
              <p
                className="rounded-md border border-amber-100/10 bg-black/20 px-3 py-2 text-sm leading-6 text-amber-50/78"
                key={prompt}
              >
                {prompt}
              </p>
            ))}
          </div>
        ) : null}
        <Link
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--persona-color)]/35 px-4 text-sm font-semibold text-amber-50 transition hover:bg-[color:var(--persona-color)]/14"
          href={`/chat?persona=${persona.id}`}
        >
          Start with {persona.displayName}
        </Link>
      </div>
    </article>
  );
}

export function PersonasGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {personas.map((persona) => (
        <PersonaCard detailed={detailed} key={persona.id} persona={persona} />
      ))}
    </div>
  );
}

export function SacredPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-amber-200/12 bg-[#120c08]/70 p-6 shadow-[0_20px_90px_rgba(0,0,0,0.3)] backdrop-blur">
      {children}
    </section>
  );
}
