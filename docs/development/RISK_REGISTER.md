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

### Local AI Service Failures

Unavailable Ollama or faster-whisper processes can interrupt AI or
voice features. Large or malformed audio can also consume local resources.

**Mitigation**: Keep typed input available, use structured timeout/unavailable
errors, require stored consent and a backend-only service token, bind model
services to loopback, and enforce byte-size plus decoded-duration limits before
inference. Hosted voice providers are not an emergency fallback.
