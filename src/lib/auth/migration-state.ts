export type AuthMigrationState =
  | "UNLINKED"
  | "PROVISIONED"
  | "VERIFIED"
  | "CUTOVER_READY"
  | "DISABLED";
