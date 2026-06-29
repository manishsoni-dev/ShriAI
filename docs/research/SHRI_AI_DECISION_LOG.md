# Shri AI Decision Log

This log records external-source-backed engineering decisions for staged
managed-service work. Date checked: 2026-06-29.

## A. Supabase SSR/Auth

| Field                | Entry                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                             |
| Source title         | Creating a Supabase client for SSR                                                                                                                   |
| Source URL           | https://supabase.com/docs/guides/auth/server-side/creating-a-client                                                                                  |
| Date checked         | 2026-06-29                                                                                                                                           |
| Decision             | Use `@supabase/ssr` cookie-backed clients for server and browser boundaries.                                                                         |
| Rationale            | SSR auth stores session state in cookies, which fits Next.js server routes and avoids browser-only local-storage auth as the server source of truth. |
| Implementation phase | P0.3A/P0.3B staging foundation                                                                                                                       |
| Validation evidence  | `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/proxy.ts`, and boundary tests.                                        |
| Rollback condition   | Disable Supabase rollout flags and keep legacy Auth.js as the only active sign-in path.                                                              |

| Field                | Entry                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | Supabase                                                                                                                                         |
| Source title         | JavaScript: getClaims                                                                                                                            |
| Source URL           | https://supabase.com/docs/reference/javascript/auth-getclaims                                                                                    |
| Date checked         | 2026-06-29                                                                                                                                       |
| Decision             | Validate server-side Supabase identity through verified Supabase Auth APIs before resolving a linked app user.                                   |
| Rationale            | Claims must be verified server-side before the app trusts `sub` as `User.supabaseAuthUserId`; browser-supplied identity fields are not accepted. |
| Implementation phase | P0.3B staging certification                                                                                                                      |
| Validation evidence  | `src/lib/auth/current-actor.ts`, `src/lib/auth/get-authenticated-user.ts`, and `tests/supabase-security.test.ts`.                                |
| Rollback condition   | Treat Supabase sessions as unavailable and fall back only to legacy Auth.js when rollout flags are disabled.                                     |

| Field                | Entry                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Shri AI                                                                                                                                     |
| Source title         | Linked identity model and legacy coexistence                                                                                                |
| Source URL           | Local architecture decision in this repository                                                                                              |
| Date checked         | 2026-06-29                                                                                                                                  |
| Decision             | Store Supabase subject UUID in `User.supabaseAuthUserId`; do not auto-link by email; allow legacy Auth.js during staging.                   |
| Rationale            | Email collision handling prevents account takeover and keeps existing users functional until cutover is certified.                          |
| Implementation phase | P0.3B staging certification                                                                                                                 |
| Validation evidence  | Callback tests cover confirmed signup, idempotence, and legacy-email collision; auth arbitration tests cover legacy fallback and conflicts. |
| Rollback condition   | Clear rollout flags and continue legacy Auth.js authentication only.                                                                        |

## B. Staging Rollout

| Field                | Entry                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                       |
| Source title         | Redirect URLs                                                                                                                                  |
| Source URL           | https://supabase.com/docs/guides/auth/redirect-urls                                                                                            |
| Date checked         | 2026-06-29                                                                                                                                     |
| Decision             | Use exact staging callback URLs and reject app-level arbitrary redirect parameters.                                                            |
| Rationale            | Supabase redirect URL configuration governs email confirmation and reset destinations; Shri AI must keep callback redirects server-controlled. |
| Implementation phase | P0.3B staging certification                                                                                                                    |
| Validation evidence  | `src/app/api/auth/supabase/callback/route.test.ts` checks fixed redirect behavior and arbitrary redirect rejection.                            |
| Rollback condition   | Remove Supabase callback URL from staging allowlist and disable rollout flags.                                                                 |

| Field                | Entry                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                 |
| Source title         | General configuration                                                                                                                    |
| Source URL           | https://supabase.com/docs/guides/auth/general-configuration                                                                              |
| Date checked         | 2026-06-29                                                                                                                               |
| Decision             | Keep new-account and linked-sign-in rollout flags disabled by default and use a staging-only Supabase project before production cutover. |
| Rationale            | Confirmed-email behavior and redirect configuration must be validated in staging without exposing production users to a partial cutover. |
| Implementation phase | P0.3B staging certification                                                                                                              |
| Validation evidence  | `src/lib/supabase/rollout.ts`, staging cutover checklist, and route/callback tests.                                                      |
| Rollback condition   | Disable server-side rollout flags; legacy Auth.js remains available.                                                                     |

## C. Future P0.3C Notifications

| Field                | Entry                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                     |
| Source title         | Email Templates                                                                                                                              |
| Source URL           | https://supabase.com/docs/guides/auth/auth-email-templates                                                                                   |
| Date checked         | 2026-06-29                                                                                                                                   |
| Decision             | Supabase owns confirmation and reset emails through configured SMTP during auth staging.                                                     |
| Rationale            | Confirmation/reset links are part of Supabase Auth flows; Shri AI application email sending is deferred to P0.3C.                            |
| Implementation phase | P0.3B staging certification                                                                                                                  |
| Validation evidence  | Staging checklist requires Supabase Auth-owned SMTP evidence and static tests prevent active auth routes from importing Resend runtime code. |
| Rollback condition   | Disable Supabase rollout flags and revert to legacy Auth.js sign-in.                                                                         |

| Field                | Entry                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Resend                                                                                                                          |
| Source title         | Idempotency Keys                                                                                                                |
| Source URL           | https://resend.com/docs/dashboard/emails/idempotency-keys                                                                       |
| Date checked         | 2026-06-29                                                                                                                      |
| Decision             | In P0.3C, Resend idempotency keys may be a retry safety layer, but the database outbox remains the permanent dedupe authority.  |
| Rationale            | Provider idempotency helps repeated API requests, but durable product-level notification state must live in Shri AI's database. |
| Implementation phase | Future P0.3C                                                                                                                    |
| Validation evidence  | No Resend API email sending exists in P0.3B.2; future outbox tests must prove durable dedupe before activation.                 |
| Rollback condition   | Disable notification worker dispatch and leave unsent outbox rows for inspection/retry.                                         |

| Field                | Entry                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | Inngest                                                                                                                        |
| Source title         | Error Handling & Retries in Inngest                                                                                            |
| Source URL           | https://www.inngest.com/docs/guides/error-handling                                                                             |
| Date checked         | 2026-06-29                                                                                                                     |
| Decision             | Future Inngest handlers must be idempotent because background function steps retry.                                            |
| Rationale            | Retry behavior can re-run failed steps; handlers must tolerate repeated delivery without duplicate emails or state corruption. |
| Implementation phase | Future P0.3C                                                                                                                   |
| Validation evidence  | P0.3B.2 does not activate Inngest jobs; future handler tests must prove idempotent replay.                                     |
| Rollback condition   | Disable Inngest event emission and process notification outbox manually.                                                       |
