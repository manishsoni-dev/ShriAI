# Authentication

Shri AI uses Auth.js through `next-auth@beta` with the Next.js App Router.

## Files

- `src/auth.ts` owns the Auth.js configuration, providers, callbacks, and route protection callback.
- `src/app/api/auth/[...nextauth]/route.ts` exposes the Auth.js route handlers.
- `src/proxy.ts` protects matched routes with Auth.js.
- `src/lib/auth/users.ts` owns credential verification and user creation.
- `src/lib/workspaces.ts` ensures every authenticated user has a default workspace.
- `src/app/sign-in/*` contains the sign-in form and server action.
- `src/app/dashboard/actions.ts` contains the sign-out server action.

## Local Credentials Flow

The current foundation uses an email/password credentials provider so the app is runnable without configuring an OAuth app.

- Sign-in verifies an existing email/password pair with `bcryptjs`.
- Registration is explicit. It creates a new `User` with the provided name and
  hashed password, then signs the user in.
- After every successful sign-in or registration, `ensureDefaultWorkspace`
  creates an owner workspace if the user does not already belong to one.
- The `OWNER` role applies only to that user's own default workspace.
- Reviewer and administrator permissions are never assigned from registration;
  they are controlled separately by `REVIEWER_EMAILS` and `ADMIN_EMAILS`.

OAuth providers can be added later in `src/auth.ts` without changing dashboard route protection.
