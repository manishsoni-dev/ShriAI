# Supabase Auth Staging Cutover Protocol

This document provides the strict manual test protocol for verifying the P0.3B
Supabase Auth cutover in a staging environment. It is not a production rollout
approval.

## 1. Prerequisites & Strict Isolation

- **Rollout Flags Default**: All rollout flags MUST remain `false` by default
  and in production.
- **Separate Staging Project**: You MUST use a dedicated, isolated Supabase
  project exclusively for staging. Do NOT use production keys.
- **Allowed Callback URLs**: Configure exact allowed callback URLs in the
  Supabase Dashboard, for example
  `https://staging.yourdomain.com/api/auth/supabase/callback`. Wildcards,
  user-controlled callback URLs, and broad domain patterns are prohibited.
- **Email Confirmation**: "Confirm email" MUST be enabled in Supabase Authentication settings.
- **SMTP Configuration**: Resend SMTP should be configured ONLY within the
  Supabase Auth settings, NEVER in the Next.js environment for this phase.
- **No Production Rollout**: This phase strictly prohibits activating these features for real users in production.

## 2. Server-Side Rollout Flags

In your staging environment, set the following variables:

```env
SUPABASE_AUTH_NEW_ACCOUNT_ENABLED="true"
SUPABASE_AUTH_LINKED_SIGNIN_ENABLED="true"
SUPABASE_AUTH_STAGING_ONLY="true"
```

If you ever need to perform a **rollback**, remove these flags or set them to
`"false"`. The system must revert to legacy Auth.js behavior.

## 3. Strict Manual Verification Protocol

You must manually verify the following scenarios in order.

### A. Signup & Confirmation

1. **Signup**: Register a new user with an email not present in the system.
   Verify that the UI reports success but does not immediately log you in.
2. **Confirmation**: Click the email confirmation link. Verify it routes
   through `/api/auth/supabase/callback` and provisions the user and default
   workspace only after confirmed claims are available.

### B. Callback Resilience

3. **Repeated Callback**: Attempt to visit the exact same callback URL again. The system must safely reject it and redirect to `/sign-in` without errors.
4. **Expired Callback**: Wait for a code to expire (or manually invalidate it), then click it. Ensure it redirects to `/sign-in`.
5. **Malformed Callback**: Alter the `code` parameter in the URL. Ensure the
   system safely catches the exchange error and redirects to `/sign-in`.
6. **Open Redirect Attempt**: Add `next`, `returnTo`, `redirect`, or
   `callbackUrl` parameters pointing at another origin. Verify the callback
   still uses only the fixed server-controlled internal redirect.

### C. Collisions & Identity

7. **Legacy-Email Collision**: Attempt to register using an email already
   existing in the legacy Auth.js database. The system MUST pretend success to
   avoid email enumeration, but strictly prevent auto-linking and parallel
   account creation.
8. **Linked Login**: Log in using a Supabase account successfully linked via
   the callback. Ensure it grants access to protected routes.
9. **Unlinked Login**: Manually create an account directly in Supabase,
   bypassing our signup UI/callback. Attempt to log in. The system MUST detect
   the lack of a linked `User` record, sign the user out of Supabase, and reject
   the login.
10. **Legacy Auth.js Login**: Ensure users who ONLY have a legacy password hash
    can still sign in and access the application.

### D. Session & State Hardening

11. **Conflicting-Session Behavior**: Artificially inject a valid legacy
    Auth.js session cookie alongside a valid Supabase session cookie for a
    different linked user. Attempt to load a protected route. The system MUST
    log the user out of both sessions and redirect to `/sign-in`.
12. **Invalid Supabase Session**: Present a malformed or expired Supabase
    session cookie. Verify access is denied and both session families are
    cleared.
13. **Logout**: Click logout. Verify that BOTH the Auth.js cookie is deleted
    AND the Supabase session is destroyed, leaving no lingering identity.
14. **Protected-Route Access Tests**: Attempt to directly access `/dashboard`,
    `/chat`, `/knowledge`, `/knowledge/search`, `/settings`, `/saved`,
    `/api/chat/stream`, `/api/voice/transcribe`, `/api/events`, scripture
    review routes, and admin routes without valid cookies. The system must
    strictly block access with redirects or 401 responses.

### E. Rollback Test

15. Disable `SUPABASE_AUTH_NEW_ACCOUNT_ENABLED` and
    `SUPABASE_AUTH_LINKED_SIGNIN_ENABLED` on the staging server. Verify that all
    registration and login attempts route exclusively through the legacy Auth.js
    credential provider.
