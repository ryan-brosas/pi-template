---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent harness: live steering, interruptible tool batches, result pairing, queue ownership, compaction cuts, and cache-aware context reduction."
disable-model-invocation: true
---
# Oh My Pi: Agent Harness Foundation

## Use this for
Live provider/tool loops, queue-owning facades, context compaction, and provider-native replay. Code and direct tests are ground truth; the references contain bounded decisive excerpts plus live Codebase Memory retrieval calls.

## Load the matching source dump
- `references/agent-loop.md` — non-consuming steering, tool-result coercion, completed-pair retention.
- `references/agent-wrapper.md` — queue ownership and empty-transcript continuation.
- `references/compaction-suite.md` — legal cuts, cache-aware prune/shake, protected output.
- `references/replay-and-occupancy.md` — honest occupancy and portable fallback for native replay.

## Provenance
Oh My Pi (MIT), `main@45e12e5`; Codebase Memory project `oh-my-pi` (84,012 nodes / 374,075 edges). Agent source paths are graph-covered; fast-index excludes the tests, so every cited test was read directly.

## Boundaries
Adopt pure contracts. Adapt provider dialects, storage, and token estimators. Omit OMP-specific telemetry and transports. For plan handoff, durable workers, task fanout, experiments, or advisor delivery, load the dedicated OMP foundation instead.
