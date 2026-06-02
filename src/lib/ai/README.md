# AI Provider Gateway

UI components must not call model APIs directly. Server routes and server actions should import `aiProvider` from `src/lib/ai`.

## Files

- `types.ts` defines the `AIProvider` interface.
- `config.ts` centralizes model configuration from environment variables.
- `errors.ts` exposes readable, typed `AIError` objects.
- `retry.ts` retries transient provider failures.
- `openai-provider.ts` contains the isolated OpenAI implementation.
- `usage-logging-provider.ts` records success and failure usage events when `usageContext` is provided.
- `index.ts` exports the configured gateway.

## Environment

- `OPENAI_API_KEY` is required for live OpenAI calls.
- `AI_CHAT_MODEL` defaults to `gpt-5-mini`.
- `AI_TEXT_MODEL` defaults to `gpt-5-mini`.
- `AI_EMBEDDING_MODEL` defaults to `text-embedding-3-small`.

## Adding Another Provider

1. Create a new provider file, for example `anthropic-provider.ts`.
2. Implement the `AIProvider` interface from `types.ts`.
3. Normalize provider failures with `normalizeAIError` or provider-specific `AIError` instances.
4. Wrap transient operations with `withAIRetry`.
5. Add provider-specific model config to `config.ts`.
6. Export the selected provider from `index.ts`.

Keep provider SDK imports inside provider implementation files so the rest of the app depends only on the gateway interface.
