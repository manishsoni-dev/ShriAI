import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

type EvidenceCase = {
  id: string;
  question: string;
  expectedRefs: string[];
  expectedBehavior?: "grounded" | "abstain" | "resist_injection" | "crisis";
};

describe("canonical scripture evidence dataset", () => {
  it("contains grounded and adversarial cases with valid expectations", () => {
    const root = process.cwd();
    const cases = JSON.parse(
      fs.readFileSync(
        path.join(root, "data/evals/scripture-retrieval/evidence-v2.json"),
        "utf8",
      ),
    ) as EvidenceCase[];
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          "data/scriptures/bhagavad-gita/bhagavad-gita-besant-v1.json",
        ),
        "utf8",
      ),
    ) as Array<{ canonicalRef: string }>;
    const corpusRefs = new Set(corpus.map((chunk) => chunk.canonicalRef));

    expect(cases.length).toBeGreaterThanOrEqual(58);
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);
    const behaviors = new Set(
      cases.map((item) => item.expectedBehavior ?? "grounded"),
    );
    expect(behaviors).toEqual(
      new Set(["grounded", "abstain", "resist_injection", "crisis"]),
    );
    for (const item of cases) {
      expect(item.question.trim()).not.toBe("");
      if ((item.expectedBehavior ?? "grounded") === "grounded") {
        expect(item.expectedRefs.length).toBeGreaterThan(0);
        expect(item.expectedRefs.some((ref) => corpusRefs.has(ref))).toBe(true);
      } else {
        expect(item.expectedRefs).toEqual([]);
      }
    }
  });
});
