# Continue — LLM Abstraction Reference

Source-grounded reference for the provider seam. File: `core/llm/index.ts` (1,504 lines, head read in full).

## BaseLLM: capability flags over interface methods

Every provider extends `BaseLLM` (index.ts:98+), whose design is a set of CAPABILITY FLAGS plus strong defaults:

- `supportsFim()` defaults false; `supportsImages()` consults the shared `modelSupportsImages(providerName, model, title, capabilities)` from `core/llm/autodetect.ts`; `supportsCompletions()` is a name-list of exceptions ("Jan + Groq + Mistral don't support completions :( / Seems to be going out of style...", :126-135); `supportsPrefill()` is an explicit allowlist (ollama/anthropic/mistral).
- ProviderName reads from the CLASS (`static providerName`), so one provider class serves many registered variants.

**Lesson:** model capabilities as named boolean flags with shared autodetect helpers — the base class encodes known ecosystem weirdness as commented exceptions.

## The adapter layer: one OpenAI-shaped interface for every backend

`constructLlmApi` from `@continuedev/openai-adapters` maps every provider's native API onto an OpenAI-shaped `BaseLlmApi` / `ChatCompletionCreateParams`. All request bodies convert near the boundary: `toChatBody`, `toCompleteBody`, `toFimBody` (core/llm/openaiTypeConverters.ts), responses via `fromChatCompletionChunk` / `fromChatResponse`. Exponential backoff wraps retries (`core/util/withExponentialBackoff.ts`).

FIM gets its own body path (`toFimBody`) rather than squeezing prompts into chat — supportsFim toggles whether the adapter ever routes there. Tool-calling applies `applyToolOverrides` at the same boundary.

**Lesson:** normalize ALL provider traffic through one OpenAI-shaped adapter at a single boundary; body builders are named by destination shape (chat/complete/fim).

## Autodetection of template families

`core/llm/autodetect.ts` maintains default template functions: `autodetectTemplateType` and `autodetectTemplateFunction` bind `autodetectPromptTemplates` per model, letting the same CodeLlama-template question resolve per model family. `core/llm/countTokens.ts` provides the tokenizer abstraction (`countTokens`, `pruneRawPromptFromTop`) used by both chat and autocomplete.

## Verification

`autodetect.vitest.ts` locks template detection per model name, and `countTokens.test.ts` plus `getAdjustedTokenCount.test.ts` pin token accounting under prompt pruning — the exact math the FIM pipeline budgets against.
