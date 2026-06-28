/**
 * Internal-only auth migration state types.
 *
 * These states track per-user progress through the Auth.js → Supabase Auth
 * migration. They MUST NOT be exposed in any API response to ordinary users.
 *
 * State machine:
 *   UNLINKED → PROVISIONED → VERIFIED → CUTOVER_READY → DISABLED
 */
import "server-only";

export type AuthMigrationState =
  | "UNLINKED"
  | "PROVISIONED"
  | "VERIFIED"
  | "CUTOVER_READY"
  | "DISABLED";
