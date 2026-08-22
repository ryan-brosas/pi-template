---
name: pi-fabric-foundation
description: "Use when building on Pi Fabric internals: Schema mutation guard, cross-process budget ledger, compaction bounds, actors, or provider patterns."
disable-model-invocation: true
---
# Pi Fabric Foundation

## Use this for
Building on Pi Fabric internals: the Schema mutation guard (hypothesize/verify/commit), a cross-process budget ledger, compaction bounds, actors, and provider patterns. Source and tests are authoritative; references resolve to decisive excerpts and plugs.

## Load the matching source dump
- `references/budget-ledger.md` — append-only JSONL cross-process budget; O_APPEND atomicity; env seeding.
- `references/internals.md` — UTF-8-safe clipping, provenance-preserving sampling, allowed-set schema.
- `references/architecture.md` — the Schema mutation guard, compaction bounds, actor/resident patterns.
- `references/ux.md` — word-diff emphasis, spinner, row balancing, preview selection, transcript sanitization.

## Capsule map
- **Budget ledger** — `references/budget-ledger.md`: append-only JSONL cross-process budget, env seeding, append-after-completion.
- **Mutation guard & internals** — `references/architecture.md`, `references/ux.md`: Schema hypothesize/verify/commit, UTF-8-safe clipping, actor resolution.

## Extending the foundation
Add one references-file capsule per seam with a part of the loader, a grouped map line, decisive source, invariant, probe, and a `search_graph` request.

## Provenance
Indexed in Codebase Memory as `pi-fabric` (`/mnt/hdd/utopia/inspo/pi-fabric`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the Schema guard, the JSONL budget ledger, and the compaction bounds; adapt the executor and provider dialects; omit the app-coupled actor/tool configuration unless ported directly.
