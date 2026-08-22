---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent harness: steering, compaction and context reduction; memory, patch editing, telemetry; plan handoff, durable workers, fanout, experiments, or advisor delivery."
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
- `references/experiment-control.md` — baseline branch isolation, branch-bound resume, durable run ledgers.
- `references/hashline.md` — line-anchored patch language and applier; pure materialize-then-syntax-veto apply pipeline.
- `references/mnemopi.md` — bank/session-scoped persistent memory facade and linear-vs-polyphonic recall orchestration.
- `references/stats.md` — honest usage windows and pure user-metric extraction that degrade instead of failing.
- `references/hashline-fs-stream.md` — pluggable Filesystem seam, numbered-line streaming, fs-mediated snapshot/recovery keys.
- `references/mnemonic-beam.md` — recall signal fusion, tier fallbacks, and consolidate/sleep compaction.
- `references/stats-sync-worker.md` — single-writer ingestion lock, worker grabs, embedded dashboard archive magic.
- `references/hashline-parser-seams.md` — lexical section splitter, lenient ranges, strict anchors, snapshot cache.
- `references/mnemonic-embeddings.md` — four-stage provider chain, guarded model heal, runtime install, host LLM bridge.
- `references/stats-db.md` — WAL init + idempotent migrations, per-file offsets, bucketed series, usage windows.
- `references/hashline-normalize-prefixes.md` — text-shape round-trip (CRLF/BOM) and echoed-prefix stripping before tokenizing.
- `references/mnemonic-binary-vectors.md` — int8/bit binary store, Hamming+cosine, triples-split migration guard.
- `references/stats-gain-dashboard.md` — savings ledger aggregation with worktree-root folding and zero-record tolerance.
- `references/hashline-clipboard-syntax.md` — clipboard register resolution and parser-backed structural proof boundaries.
- `references/mnemonic-query-cache.md` — tiered recall cache thresholds, SQLite persistence, and zero-safe cost logging.
- `references/stats-server-port.md` — dashboard route behavior, embedded client selection, and safe port reuse/reclamation.
- `references/advice-delivery.md` — severity-based steer/aside/preserve routing to a live agent.

## Wave coverage ledger
- [DONE: wave1] hashline (patch/apply seam), mnemopi (facade + orchestration), stats (usage windows + user metrics) — 3 capsules, check mjs green at wave close.
- [DONE: wave2] hashline (filesystem seam + numbered streaming), mnemopi (beam recall/consolidate), stats (sync-worker + embedded-client) — 3 capsules, check green at wave close.
- [DONE: wave3] hashline (parser/anchors/snapshots), mnemopi (embedding seam + model heal + host bridge), stats (WAL db + series + windows) — 3 capsules, check green at wave close.
- [DONE: wave4] hashline (normalize/prefix strip), mnemopi (binary vectors + triples migration), stats (gain dashboard) — 3 capsules, check green at wave close.
- [DONE: wave5] hashline (clipboard registers + syntax proof), mnemopi (query cache + cost log), stats (server + port safety) — 3 capsules, check green at wave close.
- Pending waves: hashline format/recovery tails; mnemopi temporal + recall-feature tails; stats provider/client dials; then the next queued repo (vitest on go).

## Provenance
oh-my-pi (MIT), `main@96f428097`; Codebase Memory project `oh-my-pi` (114,761 nodes / 595,806 edges, `full` index since 2026-08-22 — tests graph-covered; only `parse_partial` ranges read directly).

## Boundaries
All Oh My Pi material lives under this single foundation; prewalk, vibe workers, task orchestration, experiment control, and advisor delivery are all `references/` capsules here, not sibling leaves. Adopt pure contracts; adapt provider dialects, storage, and token estimators; omit OMP-specific telemetry and transports.
