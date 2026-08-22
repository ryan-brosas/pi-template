---
name: pydantic-ai-harness-foundation
description: "Use when building a pydantic-ai agent harness: capability/toolset abstractions, context-window compaction strategies, spend budgets, planning stores, and subagent model restrictions."
disable-model-invocation: true
---

# Pydantic-AI-Harness Foundation

## Solves
A capability-based pydantic-ai harness: every feature (memory, planning, spend, subagents, skills, media, compaction) is an AbstractCapability + toolset. Sharpest parts: the compaction package (six strategies over a resolved context window) and the spend budget.

## When to use
Building a pydantic-ai agent harness.

## Key skill-lines
- Modular agent -> the capability/toolset abstraction: each feature is an AbstractCapability exposing a toolset, optionally wrapping another (get_wrapper_toolset).
- Context compaction -> the compaction package: resolve the real window, then sliding-window (zero-cost) -> summarizing -> tiered; clamp oversized messages; clear tool results; dedupe file reads; pin load-bearing messages; keep receipts.
- Cost control -> Budget + SpendStore with time buckets, scope keys, TTL.
- Plan store -> PlanStore Protocol with InMemory/Postgres/Redis backends + event emitter.
- Subagent model limits -> validate_restriction (allowed list per agent).

## Capsule map

### Capability/toolset
- AbstractCapability + toolset, wrapper toolset chaining — `references/internals.md`.
### Compaction & spend
- sliding-window→summarizing→tiered compaction, Budget/SpendStore time buckets — `references/compaction.md`, `references/spend.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`pydantic-ai-harness`** (`/mnt/hdd/utopia/inspo/pydantic-ai-harness`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "pydantic-ai-harness", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "pydantic-ai-harness", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "pydantic-ai-harness", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "pydantic-ai-harness", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/internals.md` — window-resolution philosophy, strategy ladder overview, PlanStore protocol.
- `references/compaction.md` — SlidingWindowCompaction mechanics: pair-safe cutoffs, pinning, receipts with identity-based drops, window resolution.
- `references/spend.md` — budget-as-keys, TTL compromise table, validation-as-failure-modes, scope type checks.

## Skill Result Contract

```xml
<skill_result>
  <skill>pydantic-ai-harness-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Capability/compaction pattern ported, provenance cited, verified</evidence>
  <artifacts>Capability + compaction + budget</artifacts>
  <risks>Wrong window, dropped pairs, unbounded spend, or none</risks>
</skill_result>
```
