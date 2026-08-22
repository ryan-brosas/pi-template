---
name: turso-foundation
description: "Use when building a SQLite-compatible storage engine: bi-temporal MVCC with Hekaton-style commit dependencies, checksum-chained WAL framing with three-phase commit, b-tree rebalancing, and pin-count durability."
disable-model-invocation: true
---
# Turso Foundation

## Use this for
A SQLite-compatible storage engine: MVCC with commit dependencies, checksum-chained WAL with three-phase commit ordering, b-tree rebalancing limits, and pin-count eviction. Source and tests are the contract; the references carry the decisive excerpts.

## Load the matching source dump
- `references/mvcc.md` — bi-temporal MVCC, first-committer-wins, Hekaton counted dependencies.
- `references/wal.md` — checksum-chained WAL framing, three-phase commit ordering, recovery, checkpointing.
- `references/storage.md` — SQLite-compatible b-tree rebalancing, pin discipline, spill tags, durability ordering.

## Capsule map
- **MVCC** — `references/mvcc.md`: tagged-u64 versions, conflict rules, commit dependency graph, GC clocks.
- **WAL & storage** — `references/wal.md`, `references/storage.md`: publish-on-IO, three-phase commits, rebalancing bounds, PinGuard.

## Extending the foundation
Add one references-file capsule per seam (loader, grouped map, decisive source, invariant, invariant probe, retrieval).

## Provenance
Indexed in Codebase Memory as `turso` (`/mnt/hdd/utopia/inspo/turso`); 43,962 nodes / 310,242 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the MVCC, WAL, and b-tree durability contracts; keep SQLite frame compatibility windows; omit the server, protocol, and cloud layers unless a target requires them.
