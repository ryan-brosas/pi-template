---
name: ai-sdk-foundation
description: "Use when building LLM abstractions: predicate-array loop termination, per-step preparation, smooth streaming, tool-call repair hooks, and referential-integrity-aware history pruning."
disable-model-invocation: true
---
# AI SDK Foundation

## Use this for
Building multi-provider LLM libraries, streaming agent loops, tool-calling layers, or message-history management behind one synchronous streaming seam. Vercel AI SDK source and direct tests are ground truth; references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/streaming.md` — stop conditions, prepareStep, smoothStream, timeout layering, stitchable streams.
- `references/tool-calls.md` — parse/repair/degrade flow, prune-messages integrity, stream-time execution.
- `references/provider-interface.md` — the LanguageModelV4 seam: specification-versioned model interface, middleware wrapping, media-type URL routing.

## Capsule map
- **Provider abstraction** — `references/streaming.md`, `references/provider-interface.md`: loop termination via predicate arrays over StepResults, per-step `prepareStep` mutation, word/line/Segmenter chunked smoothStream buffering.
- **Tool-call recovery** — `references/tool-calls.md`: typed error-routed repair hooks, invalid-part degradation, referential-integrity-aware history pruning.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `ai` (`/mnt/hdd/utopia/inspo/ai`); 68,288 nodes / 204,996 edges, ~40 provider packages. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the predicate-termination, prepare-step, streaming-smoothing, and referential-pruning contracts; adapt provider dialects and sandbox/runtime hooks; omit AI SDK-specific transports, middleware, and RSC bindings unless a target requires them.
