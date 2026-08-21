---
name: turso-foundation
description: "Use when building storage engines: bi-temporal MVCC with Hekaton-style commit dependencies, checksum-chained WAL framing with three-phase commit ordering, SQLite-compatible b-tree rebalancing, and pin-count eviction safety."
disable-model-invocation: true
---

# Turso Foundation

## Solves
How turso (SQLite-compatible database in Rust) implements the hard storage-engine core: optimistic MVCC with counted commit dependencies, a checksum-chained WAL whose visibility is granted only from IO completion callbacks, b-tree rebalancing with proven bounds, and a pager that treats durability as an ordering property.

## When to use
Building databases, embedded storage engines, write-ahead logs, MVCC layers, page caches with async write-back, or any system where durability ordering and eviction safety are correctness requirements.

## Key skill-lines
- Optimistic MVCC -> tagged-u64 version timestamps, first-committer-wins deferred to ONE commit-time scan, Hekaton counted dependencies with acyclic wait graph (`references/mvcc.md`).
- WAL -> cumulative Fibonacci checksum chained per generation, publish-visibility-only-from-IO-completion, recovery that proves-then-discards, checkpoint locks held until the last durable fact publishes (`references/wal.md`).
- Storage -> asserted 3→5 sibling rebalancing bounds, mandatory legality-repair passes, PinGuard counted pins making unsafe states unrepresentable, write-pending sentinels for async spill (`references/storage.md`).
- Cross-cutting -> named perf constants beside their failure-mode comments, honest TODO debt, verification probes mined from 20k lines of tests.

## Full view (memory graph)

Indexed in Codebase Memory as **`turso`** (`/mnt/hdd/utopia/inspo/turso`). 43,962 nodes / 310,242 edges; 663 Rust files.

- `codebase_memory_get_architecture({ project: "turso", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "turso", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "turso", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/mvcc.md` — version timestamps, conflict rules, commit dependencies, GC clocks.
- `references/wal.md` — frame format, commit phases, recovery, checkpointing, read-marks, constants.
- `references/storage.md` — balancing, redistribution legality, pin discipline, spill tags, durability ordering.

## Skill Result Contract

```xml
<skill_result>
  <skill>turso-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Torn durability windows, use-after-eviction, snapshot-isolation violations, or none</risks>
</skill_result>
```