---
name: pydantic-ai-harness-foundation
description: "Use when building a pydantic-ai agent harness: capability/toolset abstractions, context-window compaction strategies, spend budgets, planning stores, and subagent model restrictions."
disable-model-invocation: true
---
# Pydantic AI Harness Foundation

## Use this for
A pydantic-ai agent harness: capability/toolset abstractions, context-window compaction, spend budgets, planning stores, and subagent model restrictions. Source and tests are authoritative; the capsules carry decisive excerpts and derived flows.

## Load the matching source dump
- `references/internals.md` — window-resolution philosophy, strategy-ladder overview, PlanStore protocol.
- `references/compaction.md` — SlidingWindowCompaction mechanics: pair-safe cutoffs, pinning, receipts, window resolution.
- `references/spend.md` — budget-as-keys, TTL table, validation failure modes, scope type checks.

## Capsule map
- **Capability/toolset** — `references/internals.md`: AbstractCapability + toolset, wrapper toolset chaining, subagent restrictions.
- **Compaction & spend** — `references/compaction.md`, `references/spend.md`: sliding-window→summarizing→tiered compaction; budget/time-bucket spend.

## Extending the foundation
Add one references-file capsule per new seam (loader line, grouped map, decisive may, invariant, probe, retrieval).

## Provenance
Indexed in Codebase Memory as `pydantic-ai-harness` (`/mnt/hdd/utopia/inspo/pydantic-ai-harness`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the capability/toolset, compaction-ladder, and budget contracts; adapt the pydantic-ai runtime and LLM; omit the specific CLI productization unless ported directly.
