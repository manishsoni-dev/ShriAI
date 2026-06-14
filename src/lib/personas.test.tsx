import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PersonaSymbol } from "@/app/_components/persona-symbol";
import { buildPersonaSystemPrompt, personas } from "@/lib/personas";

describe("personas", () => {
  it("keeps the six expected persona ids", () => {
    expect(personas.map((persona) => persona.id)).toEqual([
      "rama",
      "krishna",
      "shiva",
      "hanuman",
      "sita",
      "radha",
    ]);
  });

  it("uses Destroyer as Shiva's domain label", () => {
    const shiva = personas.find((persona) => persona.id === "shiva");
    expect(shiva?.domain).toBe("Destroyer");
    expect(shiva?.descriptor).toBe("Destroyer");
    expect(shiva?.descriptorCopy).toContain("ignorance");
    expect(shiva?.descriptorCopy).toContain("ego");
  });

  it("defines the required guidance contract fields for every persona", () => {
    const requiredFields = [
      "guidanceDomain",
      "reasoningApproach",
      "emotionalTone",
      "motivationalStyle",
      "preferredAnswerStructure",
      "scriptureThemes",
      "prohibitedBehaviors",
      "fallbackBehavior",
      "voiceDirection",
    ] as const;

    for (const persona of personas) {
      for (const field of requiredFields) {
        const value = persona[field];
        expect(Array.isArray(value) ? value.length : value).toBeTruthy();
      }

      expect(persona.prohibitedBehaviors.join(" ")).toContain(
        `claiming to be ${persona.shortName}`,
      );
    }

    expect(
      new Set(personas.map((persona) => persona.guidanceDomain)).size,
    ).toBe(personas.length);
  });

  it("prompts as Shri AI inspired by traditions rather than as an actual deity", () => {
    const prompt = buildPersonaSystemPrompt({
      persona: personas[1],
      scriptureContext: "[1] Bhagavad Gita 2.47\nTranslation: Act well.",
    });

    expect(prompt).toContain("You are Shri AI");
    expect(prompt).toContain("inspired by Hindu devotional");
    expect(prompt).toContain("must never imply that a deity is speaking");
    expect(prompt).toContain("PERSONA CONTRACT");
  });

  it("renders every persona symbol as a local inert inline SVG", () => {
    for (const persona of personas) {
      const markup = renderToStaticMarkup(
        <PersonaSymbol personaId={persona.id} />,
      );

      expect(markup).toContain("<svg");
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('viewBox="0 0 24 24"');
      expect(markup).toContain("pointer-events:none");
      expect(markup).not.toContain("<img");
      expect(markup).not.toContain("http");
    }
  });
});
