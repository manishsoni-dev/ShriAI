import type { CSSProperties, ReactNode, SVGProps } from "react";

import type { PersonaId } from "@/lib/personas";

type PersonaSymbolProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  personaId: PersonaId;
};

type SymbolProps = {
  className?: string;
  style?: CSSProperties;
};

const symbolProps = {
  "aria-hidden": "true",
  fill: "none",
  focusable: false,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.55,
  viewBox: "0 0 24 24",
} as const;

function BowSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="M7 3c4.7 4.9 4.7 13.1 0 18" />
      <path d="M7 3c7.2 2.9 7.2 15.1 0 18" opacity="0.48" />
      <path d="M7 12h12" />
      <path d="m16 9 3 3-3 3" />
      <path d="M5.5 4.8c2.2 4.4 2.2 10 0 14.4" opacity="0.42" />
    </svg>
  );
}

function FluteSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="m4.5 15.5 15-9" />
      <path d="m7.2 13.9 1.1 1.9" opacity="0.5" />
      <path d="m13.4 10.2 1.1 1.9" opacity="0.5" />
      <circle cx="9.2" cy="12.7" r="0.72" />
      <circle cx="12.1" cy="11" r="0.72" />
      <circle cx="15" cy="9.2" r="0.72" />
      <path d="M6.8 17.8c1.7 1.1 3.8.6 5.2-.8" opacity="0.42" />
    </svg>
  );
}

function TrishulSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="M12 3v18" />
      <path d="M8 4v3.1a4 4 0 0 0 8 0V4" />
      <path d="M6 6.3c0 3.8 2.7 6.2 6 6.2s6-2.4 6-6.2" opacity="0.5" />
      <path d="M9.5 18h5" />
      <path d="m12 3-1.6 2" opacity="0.5" />
      <path d="m12 3 1.6 2" opacity="0.5" />
    </svg>
  );
}

function GadaSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="m8 16 7.2-7.2" />
      <path d="m6 18 2 2 1.8-1.8-2-2z" />
      <path d="M16.3 3.8a3.3 3.3 0 1 1 3.9 3.9" />
      <path d="M14 6.1 17.9 10" />
      <path d="M13.8 8.4 15.6 11" opacity="0.48" />
    </svg>
  );
}

function LotusSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="M12 5c2.2 2 3 4.2 0 7-3-2.8-2.2-5 0-7z" />
      <path d="M6.2 9.2c3 .2 5.2 1.6 5.8 5.8-4.2-.6-5.6-2.8-5.8-5.8z" />
      <path d="M17.8 9.2c-3 .2-5.2 1.6-5.8 5.8 4.2-.6 5.6-2.8 5.8-5.8z" />
      <path d="M4.5 15.5c3.7 2.9 11.3 2.9 15 0" opacity="0.5" />
      <path d="M8 19h8" opacity="0.5" />
    </svg>
  );
}

function VeenaSymbol(props: SymbolProps) {
  return (
    <svg {...symbolProps} {...props}>
      <path d="M5 16.5c1.9-1.9 4.4-2.2 6.1-.5s1.4 4.2-.5 6.1" />
      <path d="M13.4 8.1c2-1.5 4.3-1.3 5.8.2s1.7 3.8.2 5.8" />
      <path d="M8.2 18.8 17.8 9.2" />
      <path d="M10 12.2 3.8 6" />
      <path d="M13.8 10 8.6 4.8" />
      <path d="M17.9 6.1 19.8 4.2" opacity="0.5" />
    </svg>
  );
}

const symbolByPersona = {
  hanuman: GadaSymbol,
  krishna: FluteSymbol,
  radha: VeenaSymbol,
  rama: BowSymbol,
  shiva: TrishulSymbol,
  sita: LotusSymbol,
} satisfies Record<PersonaId, (props: SymbolProps) => ReactNode>;

export function PersonaSymbol({
  className,
  personaId,
  style,
  ...props
}: PersonaSymbolProps) {
  const Symbol = symbolByPersona[personaId];

  return (
    <Symbol
      className={className}
      style={{
        pointerEvents: "none",
        ...style,
      }}
      {...props}
    />
  );
}
