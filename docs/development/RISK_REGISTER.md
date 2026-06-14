# Risk Register

## Security Risks

### Leaked Credentials from Initial Archive

The initial project archive contained populated `.env` and `.env.local` files.

**Mitigation & Required Action**:
Even though these files are correctly ignored by Git (`.gitignore`) and were never committed to the repository history, any sensitive keys contained within the unversioned local files must be immediately rotated by the system administrator to prevent compromise from the external archive transfer.

## Operational Risks

### Database Schema Drift

Direct database schema changes without corresponding migrations can cause production failures.
**Mitigation**: Always use `prisma migrate dev` to generate structured, version-controlled migrations for the database.

### AI Provider Failures

Rate limits, timeouts, or downtime from external AI providers (OpenAI, ElevenLabs, Deepgram) can block primary user workflows.
**Mitigation**: Graceful degradation (e.g., fallback to text if voice synthesis fails) and structured error handling are necessary.
