# AI Provider Gateway

UI components must not call model APIs directly. Server routes and server actions should import `aiProvider` from `src/lib/ai`.

## Files

- `types.ts` defines the `AIProvider` interface.
- `config.ts` centralizes model configuration from environment variables.
- `errors.ts` exposes readable, typed `AIError` objects.
- `retry.ts` retries transient provider failures.
- `ollama-provider.ts` contains the native local Ollama implementation.
- `usage-logging-provider.ts` records success and failure usage events when `usageContext` is provided.
- `index.ts` exports the configured gateway.

## Environment

- `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`.
- `SHRI_AI_CHAT_MODEL` defaults to `qwen3:8b`.
- `SHRI_AI_EMBEDDING_MODEL` defaults to `qwen3-embedding:0.6b`.
- No API key is required.

## Adding Another Provider

1. Create a new server-only provider file.
2. Implement the `AIProvider` interface from `types.ts`.
3. Normalize provider failures with `normalizeAIError` or provider-specific `AIError` instances.
4. Wrap transient operations with `withAIRetry`.
5. Add provider-specific model config to `config.ts`.
6. Export the selected provider from `index.ts`.

Keep provider transport details inside provider implementation files so the rest of the app depends only on the gateway interface. Hosted AI providers are intentionally not configured in this project.
