---
name: ai-sdk-foundation
description: "Use when building LLM abstractions: predicate-array loop termination, per-step preparation, smooth streaming, tool-call repair hooks, and referential-integrity-aware history pruning."
disable-model-invocation: true
---
# AI SDK Foundation

## Solves
How the Vercel AI SDK abstracts every provider behind one streaming interface: composable loop termination, per-step mutation, chunk-smoothing for UIs, typed tool-call repair, and history pruning that preserves tool-reference integrity.

## When to use
Building multi-provider LLM libraries, streaming agent loops, tool-calling layers, or message-history management.

## Key skill-lines
- Loop termination -> stop-condition predicate ARRAYS over accumulated StepResults (isStepCount/isLoopFinished/hasToolCall); default isStepCount(1) (`references/streaming.md`).
- Per-step control -> prepareStep mutates model/tools/sandbox/runtime-context between steps.
- UI comfort -> smoothStream buffers text-deltas and drains via word/line/RegExp/Segmenter/detector chunking at 10ms, flushing on type/id changes (`references/streaming.md`).
- Broken tool calls -> parse → typed-error-routed repair hook → degrade to visible invalid parts; both cause and original preserved (`references/tool-calls.md`).
- History pruning -> global id→name maps + keep-set collection from the retained window BEFORE filtering, so approval responses never orphan (`references/tool-calls.md`).

## Full view (memory graph)

Indexed in Codebase Memory as **`ai`** (`/mnt/hdd/utopia/inspo/ai`). 68,288 nodes / 204,996 edges; 6,030 TS files; ~40 provider packages.

- `codebase_memory_get_architecture({ project: "ai", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "ai", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "ai", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/streaming.md` — stop conditions, prepareStep, smoothStream, timeout layering, stitchable streams.
- `references/tool-calls.md` — parse/repair/degrade flow, prune-messages integrity, stream-time execution.
- `references/provider-interface.md` — the LanguageModelV4 seam: specification-versioned model interface, middleware wrapping, media-type URL routing.

## Unmined subsystems

- `packages/provider/src/` — LanguageModelV4 provider interface (the whole abstraction seam).
- `packages/ai/src/ui-message-stream/` — UIMessage wire protocol.
- `core/nextEdit`-style generation paths and RSC bindings.

## Skill Result Contract

```xml
<skill_result>
  <skill>ai-sdk-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Orphaned approvals, silent tool-call drops, unbounded loops, or none</risks>
</skill_result>
```