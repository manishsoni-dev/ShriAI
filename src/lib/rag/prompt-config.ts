export type PromptExperimentConfig = {
  id: string;
  description: string;
  lengthConstraint: "concise" | "expanded" | "standard";
  personaContractPlacement: "beginning" | "end";
  includePracticalStep: boolean;
  includeReflectionQuestion: boolean;
  fallbackLanguage: "apologetic" | "direct" | "standard";
  explicitUncertainty: boolean;
};

export const BASELINE_PROMPT_CONFIG: PromptExperimentConfig = {
  id: "baseline-prompt-v1",
  description: "Standard production prompt with no experimental features",
  lengthConstraint: "standard",
  personaContractPlacement: "beginning",
  includePracticalStep: false,
  includeReflectionQuestion: false,
  fallbackLanguage: "standard",
  explicitUncertainty: false,
};
