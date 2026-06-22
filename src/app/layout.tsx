import type { Metadata } from "next";
import { AudioExperienceProvider } from "@/app/_components/AudioExperienceProvider";
import { SharedCosmicBackground } from "@/app/_components/SharedCosmicBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "Divine Persona AI | Shri AI",
  description:
    "A premium devotional AI guidance experience inspired by dharma, bhakti, Jñāna, and seva.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="var-font-geist-sans var-font-geist-mono var-font-cormorant var-font-noto-devanagari h-full antialiased"
      suppressHydrationWarning
    >
      <body className="site-root min-h-full flex flex-col antialiased">
        <SharedCosmicBackground />
        <div className="site-atmosphere" aria-hidden="true" />
        <div className="application-content site-content flex min-h-full flex-col flex-1">
          {children}
        </div>
        <AudioExperienceProvider />
      </body>
    </html>
  );
}
