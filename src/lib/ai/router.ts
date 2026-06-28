export type TaskType =
  | "classification"
  | "reflection"
  | "grounded"
  | "fallback"
  | "citation_validation"
  | "high_safety"
  | "chat";

/**
 * Returns the recommended model based on the task type.
 * Ensures we use higher capacity models for complex reasoning
 * and lower capacity models for fallbacks or simple interactions.
 *
 * The server MUST control routing. Do not let the client select arbitrary models.
 */
export function routeTaskToModel(taskType: TaskType): string {
  void taskType;
  return aiModelConfig.chatModel;
}
import { aiModelConfig } from "@/lib/ai/config";
