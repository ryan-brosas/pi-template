---
name: continue-foundation
description: "Use when building IDE autocomplete/inline-suggestion engines: FIM prompt templating with token pruning, generator reuse across keystrokes, stream-filter heuristics, and prefix-keyed LRU caching."
disable-model-invocation: true
---
# Continue Foundation

## Use this for
Sub-second, trustworthy inline code completion: a stage-bail pipeline, reuse of in-flight generation across keystrokes, stream-time filtering of model manners, and per-model FIM templates with token-budget pruning. Source and direct tests are ground truth; references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/autocomplete.md` — the full pipeline, generator reuse, stream filters, templating, caching.
- `references/llm-abstraction.md` — BaseLLM capability flags, OpenAI-adapter layering, autodetected prompt templates.
- `references/next-edit.md` — Instinct next-edit prediction: sentinel token prompting, editable regions, prefetch queueing.

## Capsule map
- **Pipeline & caching** — `references/autocomplete.md`: stage-bail autocomplete pipeline, prefix-keyed LRU, GeneratorReuseManager.
- **FIM prompts & LLM** — `references/llm-abstraction.md`, `references/next-edit.md`: per-model templates, token pruning, LLM abstraction and next-edit reuse across keystrokes.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `continue` (`/mnt/hdd/utopia/inspo/continue`); 51,815 nodes / 120,775 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the stage-bail pipeline, generator reuse, stream-filter, and token-pruning contracts; adapt model providers and editor transports; omit Continue-specific IDE integrations and onboarding unless a target requires them.
