---
name: continue-foundation
description: "Use when building IDE autocomplete / inline-suggestion engines: FIM prompt templating with token pruning, generator reuse across keystrokes, stream-filter heuristics, and prefix-keyed LRU caching."
disable-model-invocation: true
---
# Continue Foundation

## Solves
How continue ships sub-second, trustworthy inline code completion: an eleven-stage pipeline where every stage can bail, in-flight generation REUSE across keystrokes, stream-time filtering of model manners, and per-model FIM templates with token-budget pruning.

## When to use
Building autocomplete/inline-suggestion engines, streaming LLM UX, FIM prompting, or any system where users type faster than models respond.

## Key skill-lines
- Pipeline design -> every stage bails to undefined; cache on prunedPrefix; never post-process aborted streams (`references/autocomplete.md`).
- Keystroke racing -> GeneratorReuseManager: reuse the running generation when typed prefix ⊆ pending output; strip already-typed chars from yields (`references/autocomplete.md`).
- Output trust -> line-level filter pipeline: English-phrase stripping, bracket-aware stopping, quote/identifier-guarded pattern validation (`references/autocomplete.md`).
- FIM prompts -> per-model templates, snippet pruning under token budget, stop tokens derived from template format (`references/autocomplete.md`).

## Capsule map

### Pipeline & caching
- Stage-bail autocomplete pipeline, prefix-keyed LRU, GeneratorReuseManager — `references/autocomplete.md`.
### FIM prompts & LLM
- Per-model templates, token pruning, LLM abstraction and next-edit reuse — `references/llm-abstraction.md`, `references/next-edit.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`continue`** (`/mnt/hdd/utopia/inspo/continue`). 51,815 nodes / 120,775 edges; 1,757 TS files.

- `codebase_memory_get_architecture({ project: "continue", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "continue", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "continue", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/autocomplete.md` — the full pipeline, generator reuse, stream filters, templating, caching.
- `references/llm-abstraction.md` — BaseLLM capability flags, OpenAI-adapter layering, autodetected prompt templates.
- `references/next-edit.md` — Instinct next-edit prediction: sentinel token prompting, editable regions, prefetch queueing.

## Unmined subsystems

- `core/llm/index.ts` (1,504 lines) — the LLM abstraction layer.
- `core/indexing/` — codebase indexing for retrieval.
- `core/nextEdit/` — next-edit prediction (newer paradigm).

## Skill Result Contract

```xml
<skill_result>
  <skill>continue-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Latency regressions, leaked conversational text into code, stale caches, or none</risks>
</skill_result>
```