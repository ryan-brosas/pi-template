---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent harness: steering, compaction cuts, and context reduction; plan handoff, durable workers, fanout, experiments, or advisor delivery."
disable-model-invocation: true
---
# Oh My Pi: Agent Harness Foundation

## Use this for
Live provider/tool loops, queue-owning facades, context compaction, replay, plan handoff, durable workers, multi-agent task fanout, experiment automation, and advisor delivery. Code and direct tests are ground truth; the references carry bounded decisive excerpts plus live Codebase Memory retrieval calls.

## Load the matching source dump
- `references/agent-loop.md` — non-consuming steering, tool-result coercion, completed-pair retention.
- `references/agent-wrapper.md` — queue ownership and empty-transcript continuation.
- `references/compaction-suite.md` — legal cuts, cache-aware prune/shake, protected output.
- `references/replay-and-occupancy.md` — honest occupancy and portable fallback for native replay.
- `references/prewalk-and-plan-handoff.md` — plan-to-implementation handoff gated on a durable write boundary.
- `references/durable-workers.md` — parent-scoped worker session persistence and teardown-safe records.
- `references/fanout-and-budgets.md` — ordered fanout, cancellation-safe concurrency, soft-to-hard execution budgets.
- `references/isolation-and-provider-permits.md` — worktree isolation and narrow provider concurrency permits.
- `references/experiment-control.md` — clean-baseline branch isolation, branch-bound resume, durable run ledgers.
- `references/advice-delivery.md` — severity-based steer/aside/preserve routing to a live agent.

## Provenance
oh-my-pi (MIT), `main@45e12e5`; Codebase Memory project `oh-my-pi` (112,667 nodes / 556,147 edges, `full` index since 2026-08-22 — tests graph-covered; only `parse_partial` ranges read directly).

## Boundaries
All Oh My Pi material lives under this single foundation; prewalk, vibe workers, task orchestration, experiment control, and advisor delivery are all `references/` capsules here, not sibling leaves. Adopt pure contracts; adapt provider dialects, storage, and token estimators; omit OMP-specific telemetry and transports.
