export type TaskType = "fallback" | "grounded" | "chat";

/**
 * Returns the recommended model based on the task type.
 * Ensures we use higher capacity models for complex reasoning
 * and lower capacity models for fallbacks or simple interactions.
 */
export function routeTaskToModel(taskType: TaskType): string {
  // We can pull these from environment variables in the future
  const highCapacityModel = process.env.AI_ROUTER_HIGH_CAPACITY ?? "gpt-4o";
  const lowCapacityModel = process.env.AI_ROUTER_LOW_CAPACITY ?? "gpt-4o-mini";

  switch (taskType) {
    case "fallback":
    case "chat":
      return lowCapacityModel;
    case "grounded":
    default:
      return highCapacityModel;
  }
}
