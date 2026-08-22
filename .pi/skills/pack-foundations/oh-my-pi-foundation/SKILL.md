---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent harness: steering, compaction and context reduction; memory, patch editing, telemetry; plan handoff, durable workers, fanout, experiments, or advisor delivery."
disable-model-invocation: true
---
# Oh My Pi: Agent Harness Foundation

## Use this for
Agent-harness work: provider loops, queue-owning facades, compaction, replay, plan handoff, durable workers, task fanout, experiments, advisor delivery. Code and tests are ground truth; references carry decisive excerpts plus live Codebase Memory retrieval calls.

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
- `references/hashline-format-recovery.md` — format grammar, content-derived identity, and anchor-proved recovery.
- `references/mnemonic-temporal-gates.md` — deterministic temporal parser and host/env recall feature gates.
- `references/stats-provider-client.md` — bounded abortable dashboard data client over typed API endpoints.
- `references/advice-delivery.md` — severity-based steer/aside/preserve routing to a live agent.

## Capsule map
Each capsule pairs a decisive excerpt, invariants, a live `mcp.codebase_memory.search_graph` call, and a probe at a real test. The map records seams, not history.

- **Patch language** — grammar, parsing, addressing, replay, fs seams: `hashline`, `hashline-fs-stream`, `hashline-parser-seams`, `hashline-normalize-prefixes`, `hashline-clipboard-syntax`, `hashline-format-recovery`.
- **Memory** — facade, recall, embeddings, binary vectors, cache, temporal gates: `mnemopi`, `mnemonic-beam`, `mnemonic-embeddings`, `mnemonic-binary-vectors`, `mnemonic-query-cache`, `mnemonic-temporal-gates`.
- **Telemetry** — usage windows, sync worker, WAL series, gain dashboard, server/port, provider/client: `stats`, `stats-sync-worker`, `stats-db`, `stats-gain-dashboard`, `stats-server-port`, `stats-provider-client`.
- **Harness seams** — steering, wrapper, compaction, replay, navigator, workers, fan-out, experiments, isolation: `agent-loop`, `agent-wrapper`, `compaction-suite`, `replay-and-occupancy`, `prewalk-and-plan-handoff`, `durable-workers`, `fanout-and-budgets`, `isolation-and-provider-permits`, `experiment-control`, `advice-delivery`.

### Extending the foundation
Add one `references/*.md` capsule per new seam: a catalog line, a decisive excerpt, an invariant, a `Probe`, a `search_graph` call. Reuse the pattern.

## Provenance
oh-my-pi (MIT), `main@96f428097`; Codebase Memory project `oh-my-pi` (114,761 nodes / 595,806 edges, `full` index since 2026-08-22 — tests graph-covered; only `parse_partial` ranges read directly).

## Boundaries
All Oh My Pi material lives under this single foundation; prewalk, vibe workers, task orchestration, experiment control, and advisor delivery are all `references/` capsules here, not sibling leaves. Adopt pure contracts; adapt provider dialects, storage, and token estimators; omit OMP-specific telemetry and transports.
