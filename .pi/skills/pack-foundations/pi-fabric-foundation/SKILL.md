---
name: pi-fabric-foundation
description: "Use when building on Pi Fabric internals: the Schema mutation guard, cross-process budget ledger, compaction bounds, actors, or provider patterns."
disable-model-invocation: true
---
---
name: pi-fabric-foundation
description: "Use when building on Pi Fabric internals: the Schema mutation guard, cross-process budget ledger, compaction bounds, actors, or provider patterns."
disable-model-invocation: true
---

# Pi Fabric Foundation

## Solves
Pi Fabric: the Schema mutation guard + full-code executor for Pi. Three things to mine: the cross-process budget ledger, the UTF-8-safe compaction bounds, and the Schema guard.

## When to use
Building on Pi Fabric internals: Schema guard, cross-process cost budgets, compaction, actors, or providers.

## Key skill-lines
- Cross-process cost budget across agent recursion -> port `src/agents/budget-ledger.ts`: append-only JSONL, PI_FABRIC_BUDGET* env propagation, append-after-completion, tolerant reads, best-effort check + race-free per-execution ceiling.
- Mutation guard -> the Schema loop (hypothesize/verify/commit) with evidence kinds, declared file ops + sha256 postconditions, transaction journal with before-images.
- UTF-8-safe context clipping -> `src/compaction/bounds.ts` clipUtf8 (code-point iteration).
- Sample without losing provenance -> `sampleAddressedFrom` + `omissionLine`.
- Actor resolution -> `GlobalActorRegistry.resolve` (fan-in 25).

## Full view (memory graph)

Indexed in Codebase Memory as **`pi-fabric`** (`/mnt/hdd/utopia/inspo/pi-fabric`, branch `feat/veda-runner`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "pi-fabric", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "pi-fabric", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "pi-fabric", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "pi-fabric", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — Schema evidence/ops/records + allowlist, compaction exports, red flags, verification.
- `references/internals.md` — budget-ledger semantics from source (O_APPEND atomicity, tolerant reads, env seeding/lifecycle), UTF-8-safe clipping, provenance-preserving sampling.

## Skill Result Contract

```xml
<skill_result>
  <skill>pi-fabric-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, checks run</evidence>
  <artifacts>Ported pattern + path</artifacts>
  <risks>Overstated ceiling, uncommitted guard, split multibyte, or none</risks>
</skill_result>
```
