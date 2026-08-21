# AI SDK — Provider Interface Reference

Source-grounded reference for the multi-provider seam. Files: `packages/provider/src/language-model/v4/language-model-v4.ts` (read in full), `packages/provider/src/language-model-middleware/v4/language-model-v4-middleware.ts` (read in full), plus the provider versions `packages/provider/src/provider/v{2,3,4}/provider-v{2,3,4}.ts`.

## The seam: specification-versioned model interfaces

The entire `@ai-sdk/provider` package exists as a TYPE-ONLY contract that ~40 provider packages implement. `LanguageModelV4` (`language-model-v4.ts`, full) is the smallest possible surface: `specificationVersion: 'v4'`, `provider`, `modelId`, `supportedUrls` (media-type → RegExp[] patterns, matched lower-case, natively-handled URLs skip download), and exactly TWO operations — `doGenerate` and `doStream`. Both return higher-level output parts rather than raw provider payloads.

The `do` prefix carries explicit intent, verbatim from the docstring: "Naming: 'do' prefix to prevent accidental direct usage of the method by the user."

Interfaces are VERSIONED (`LanguageModelV2`/`V3`/`V4` coexist; middleware mirrors them as `language-model-v2/v3/v4-middleware.ts`) — breaking changes ship as a new version alongside the old rather than forcing all providers to migrate at once.

**Lesson:** publish the integration seam as a tiny spec-versioned interface; providers implement a contract measured in TWO methods, and breaking changes only add parallel versions.

## Middleware: transform + wrap over the same call-shaped surface

`LanguageModelV4Middleware` (read in full) composes settlements from named hooks:

- **Identity overrides** — overrideProvider / overrideModelId / overrideSupportedUrls (routing, aliasing).
- **transformParams** — mutates `LanguageModelV4CallOptions` BEFORE the call, per operation type.
- **wrapGenerate / wrapStream** — take the ORIGINAL `doGenerate`/`doStream` (already params-transformed), the params, and the model, and return the result — a gateway pattern: auth injection, caching, retries, billing can all wrap without re-implementing the provider.

The wrap signature passes BOTH functions so a middleware can convert the call shape (e.g. a gateway emitting fallbacks); done as `() =>` thunks, not values, so wrapping stays lazy and both paths stay usable.

**Lesson:** middleware = small overridable identities + params transform + operation wrapping that receives the uninvoked original as a thunk — one hook shape covers auth, cache, retry, fallback, and observability.

## The provider object

`provider-v4.ts` bundles everything implementable under one roof: `specificationVersion`, languageModel(), textEmbeddingModel(), imageModel(), speechModel(), transcriptionModel(), realtimeModel(), rerankingModel(), skills, batch — each returning setters used by the `packages/ai` core via `@ai-sdk/provider`. Unsupported modalities return null; discovery is via returning factory functions.

## Versioning economics

Every provider implements at most the VERSION it supports; the core adapts older providers (`resolveLanguageModel` in `packages/ai/src/model/resolve-model.ts`) so user code stays provider-agnostic. The cost of keeping V2/V3 alive is paid once in the core's adapters, not fifty times in providers.

## Verification

`packages/ai/src/generate-text/stream-language-model-call.ts` exercises doStream end-to-end with retry policy wiring via `prepareRetries`; `packages/ai/src/util/merge-abort-signals.ts` merges caller + timeout controllers for all calls; `smooth-stream.test.ts` covers the stream-transform stage consumed by the UI layer.
