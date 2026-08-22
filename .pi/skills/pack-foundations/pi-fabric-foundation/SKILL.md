---
name: pi-fabric-foundation
description: "Use when building on Pi Fabric internals: Schema mutation guard, cross-process budget ledger, compaction bounds, actors, or provider patterns."
disable-model-invocation: true
---
# Pi Fabric Foundation

## Use this for
Building on Pi Fabric internals: the Schema mutation guard (hypothesize/verify/commit), a cross-process budget ledger, compaction bounds, actors, and provider patterns. Source and tests are authoritative; references resolve to decisive excerpts and plugs.

## Load the matching source dump
- `references/architecture.md` — the Schema mutation guard (authorize → hypothesize → verify → commit with journaled recovery).
- `references/budget-ledger.md` — append-only JSONL cross-process budget; O_APPEND atomicity; env seeding.
- `references/atomic-write.md` — temp-file + atomic rename, Windows contention retry.
- `references/compaction-bounds.md` — UTF-8-safe clipping, canonicalization, provenance-preserving sampling.
- `references/prewalk.md` — the plan-first handoff state machine (arm → claim-on-mutation → continuation).
- `references/mesh-store.md` — append-only event log + key-version CAS state + lock coordination.
- `references/memory-discovery.md` — session enumeration and scope resolution (session/project/global).
- `references/ux.md` — transcript sanitization as a security surface + supporting UI checklist.

## Capsule map
- **Mutation guard** — `references/architecture.md`: authorize/hypothesize/verify/commit, allowlist, journaled recovery.
- **Budget & atomic writes** — `references/budget-ledger.md`, `references/atomic-write.md`: append-only JSONL budget, temp+rename atomic write.
- **Compaction bounds** — `references/compaction-bounds.md`: UTF-8-safe clip, canonicalize, earliest+latest sample.
- **Prewalk & delegation** — `references/prewalk.md`: arm → claim-on-mutation → continuation settle → re-arm.
- **Mesh & memory** — `references/mesh-store.md`, `references/memory-discovery.md`: event log + CAS state, session scope resolution.
- **UI security** — `references/ux.md`: transcript sanitization (escape/bidi defense, grapheme-safe clip, secret redaction).

## Extending the foundation
Add one references-file capsule per seam with a part of the loader, a grouped map line, decisive source, invariant, probe, and a `search_graph` request.

## Provenance
Indexed in Codebase Memory as `pi-fabric` (`/mnt/hdd/utopia/inspo/pi-fabric`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the Schema guard, the JSONL budget ledger, the compaction bounds, prewalk, and atomic writes; adapt the executor and provider dialects; omit the app-coupled actor/tool configuration unless ported directly.
