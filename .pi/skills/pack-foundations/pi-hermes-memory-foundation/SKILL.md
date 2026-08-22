---
name: pi-hermes-memory-foundation
description: "Use when building agent persistent memory: SQLite FTS5 memory/session search, atomic Markdown memory with metadata comments, corruption-recovering SQLite manager, cross-process lock coordinator, procedural skill store, standing instructions, and content/secret scanning."
disable-model-invocation: true
---
# Pi-Hermes-Memory: Agent Persistent Memory Foundation

## Use this for
Build a coding-agent persistent-memory extension: token-aware Markdown memory (MEMORY.md/USER.md/failures.md) with metadata comments and atomic conflict-safe writes, an SQLite mirror with FTS5 full-text search over memories and session messages, corruption-recovering database management, a cross-process atomic lock coordinator, procedural skill storage, always-injected standing instructions, and content/secret scanning on every write. Source code and direct tests are ground truth; references carry decisive excerpts and graph retrieval. The repo's direct tests are excluded from the index by design (`fast-pattern`), so probes are named from the on-disk test files but the graph coverage caveat is stated in each capsule.

## Load the matching source dump
- `references/memory-store.md` — the §-delimited Markdown memory store with metadata comments, char limits, FIFO eviction, atomic conflict-safe writes, and frozen system-prompt snapshots.
- `references/sqlite-mirror.md` — idempotent Markdown→SQLite reconciliation with exact identity, orphan pruning, and scope-aware substring replace/remove.
- `references/fts5-search.md` — FTS5 memory/session search with natural-language query normalization, operator passthrough, and LIKE fallback.
- `references/sqlite-native-loader.md` — the better-sqlite3 loader with ABI-mismatch detection and one-shot npm rebuild recovery.
- `references/database-manager.md` — the corruption-recovering SQLite manager: WAL config, integrity checks, legacy-schema migration, and rebuild-or-recreate recovery.
- `references/atomic-lock-coordinator.md` — the cross-process SQLite-backed lock coordinator with token fencing, incarnation probing, stale takeover, and dead-lock GC.
- `references/content-scanner.md` — injection/exfiltration threat-pattern and secret/credential scanning that blocks every memory write.
- `references/session-indexer.md` — JSONL session parsing, incremental size/mtime backfill, and live-session indexing.
- `references/session-anchor-search.md` — the bounded markdown-request JSONL anchor search with scan caps, term scoring, and range merging.
- `references/skill-store.md` — procedural memory as Pi-native skills: create/patch/edit/move/delete with duplicate/similar/shadow guards and legacy migration.
- `references/standing-instructions.md` — the always-injected, hard-budgeted standing-instruction store with loud truncation.
- `references/correction-detector.md` — the two-pass correction detector that triggers an immediate memory save.
- `references/review-transport.md` — the direct in-process LLM completion transport with fresh-auth re-read, auth-rejection retry, and structured operation parsing.
- `references/config-paths.md` — layered config loading with validation and the agent-root/path normalization helpers.

## Capsule map
- **Markdown memory** — `references/memory-store.md`: §-delimited entries, `<!-- created=…, last=…, project64=… -->` metadata comments, char limits, FIFO eviction, atomic temp+link/rename writes, external-write conflict retry, frozen system-prompt snapshot.
- **SQLite mirror** — `references/sqlite-mirror.md`: exact-identity upsert, scope reconcile with orphan pruning, LIKE-escaped substring replace/remove, exact-content remove.
- **Full-text search** — `references/fts5-search.md`: FTS5 MATCH subquery, natural-language normalization, operator passthrough, OR fallback, LIKE fallback for CJK, `isFts5QueryError` recovery.
- **Native loader** — `references/sqlite-native-loader.md`: lazy better-sqlite3 load, ABI/dlopen mismatch detection, one npm rebuild, actionable error.
- **Database manager** — `references/database-manager.md`: lazy Bun/better-sqlite3 ctor, WAL + busy_timeout + FK config, quick_check integrity, legacy migration, rebuild-or-recreate with row salvage and backup retention.
- **Locking** — `references/atomic-lock-coordinator.md`: SQLite `BEGIN IMMEDIATE` lock rows, token fencing, pid+incarnation liveness, stale takeover, heartbeat renew, dead-lock GC, shared coordinator.
- **Security** — `references/content-scanner.md`: invisible-unicode, threat-pattern, and secret/credential regex blocking; `scanSecrets` non-blocking variant.
- **Session indexing** — `references/session-indexer.md`: JSONL parse (skip thinking/tool_use, extract tool calls), incremental size/mtime backfill newest-first, live-session index, `needsBackfill`.
- **Anchor search** — `references/session-anchor-search.md`: markdown request parse (from/to/cwd/all/any/exclude), scan caps, term scoring, adjacent-range merge.
- **Procedural skills** — `references/skill-store.md`: slugify + frontmatter, duplicate/similar/name-collision/shadow guards, section patch with JSON-array coercion, legacy migration sentinel.
- **Standing instructions** — `references/standing-instructions.md`: always-injected fenced block, entry+char budget, loud truncation, user-only provenance.
- **Correction detection** — `references/correction-detector.md`: strong/weak/negative pattern filter with directive-word gating, rate-limited immediate save.
- **LLM transport** — `references/review-transport.md`: direct completion with fresh-auth re-read, auth-rejection retry-once, structured operation parse, atomic-shrink application.
- **Config & paths** — `references/config-paths.md`: defaults-override merge with per-field validation, overflow-strategy/transport/variant enums, agent-root + safe path normalization.

## Extending the foundation
Add one `references/<seam>.md` capsule for one graph-selected, source-confirmed porting question. Add one matching loader line and map entry; keep evidence in the capsule, not this leaf. Each new capsule must carry Path/Symbol, Signature, Data Shape, a labelled decisive source excerpt, Flow, Invariant, a direct-test Probe, and a `search_graph` Retrieve.

## Provenance
pi-hermes-memory (MIT, `main@26f0acaa7741a81ea28eb992ab7ffcfdb7b50a0c`); Codebase Memory project `pi-hermes-memory` (fast index: 1,049 nodes / 3,171 edges, indexed 2026-08-15). Direct tests are excluded by design (`fast-pattern` skip-list); cited source files report `no_recorded_issue` + `metadata_match` (best-effort).

## Full view (memory graph)
Revalidate `pi-hermes-memory` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source and direct tests decide shipped claims. The index excludes `tests/`, `src/tools`, `docs`, and `scripts` by design, so direct-test probes are named from the on-disk files but are not graph-covered.

## Boundaries
Adopt the Markdown memory contract, the SQLite mirror + FTS5 search, the corruption-recovering DatabaseManager, the AtomicLockCoordinator, content/secret scanning, session indexing/anchor search, the SkillStore, StandingInstructions, correction detection, and the direct review transport. Adapt the config keys, default paths, threat/secret regex lists, correction pattern lists, and provider/model resolution to the host. Omit the Pi extension wiring (`index.ts` command registration, `pi.on` hooks), the child-process `pi -p` subprocess transport, and the extension-root migration unless a target needs them.
