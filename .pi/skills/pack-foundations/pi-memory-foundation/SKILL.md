---
name: pi-memory-foundation
description: "Use when building a coding-agent persistent-memory extension: plain-Markdown memory with timestamp comments, line-preserving scratchpad mutations, forget/restore with durable recovery records, KV-cache-stable context snapshotting, and qmd-powered keyword/semantic/deep search."
disable-model-invocation: true
---
# Pi-Memory: Agent Persistent-Memory Extension Foundation

## Use this for
Build a coding-agent persistent-memory extension: a plain-Markdown memory system (MEMORY.md + SCRATCHPAD.md + daily/YYYY-MM-DD.md logs) with invisible timestamp comments, line-preserving scratchpad mutations that never delete hand-written notes, forget/restore backed by durable recovery records, a byte-stable KV-cache snapshot of injected context, and qmd-powered keyword/semantic/deep search that self-heals missing embeddings. Source code and direct tests are ground truth; references carry decisive excerpts and graph retrieval. The repo's direct tests are excluded from the index by design (`fast-pattern` skip-list), so probes are named from the on-disk test files but the graph coverage caveat is stated in each capsule.

## Load the matching source dump
- `references/paths-and-dates.md` — local-calendar date helpers, memory-dir resolution, and daily-path validation.
- `references/preview-truncation.md` — the line/char-bounded, mode-aware preview and context-section builders that keep injected context within budget.
- `references/scratchpad.md` — line-preserving scratchpad parse/serialize/add/toggle/clear-done mutations.
- `references/forget-restore.md` — block-aware forget with durable recovery records and idempotent restore.
- `references/context-builder.md` — the priority-ordered memory context builder with per-section and overall char caps.
- `references/exit-summary.md` — the gated, timeout-bounded auto exit-summary that writes only real content to the daily log.
- `references/qmd-transport.md` — the qmd CLI wrapper: Windows shim bypass, ANSI stripping, JSON parsing, and collection setup.
- `references/qmd-search.md` — keyword/semantic/deep search modes, result shaping, embedding self-heal, and limit clamping.
- `references/qmd-lifecycle.md` — detect/embed/update scheduling with TTL caching, in-flight dedup, and background modes.
- `references/snapshot.md` — the KV-cache-stable memory snapshot that keeps the system prompt byte-stable across turns.
- `references/tool-surface.md` — the six memory tools + status doctor and the seven lifecycle hooks that wire it into Pi.

## Capsule map
- **Paths & dates** — `references/paths-and-dates.md`: `PI_MEMORY_DIR` override, cross-platform home resolution, LOCAL-calendar date helpers, strict daily-date validation, `_setBaseDir` test seam.
- **Preview & truncation** — `references/preview-truncation.md`: start/end/middle line+char truncation, `buildPreview`, `formatPreviewBlock`, `formatContextSection`.
- **Scratchpad** — `references/scratchpad.md`: `- [ ] text` checklist with `<!-- ts [sid] -->` meta, line-preserving add/toggle/clear-done that never deletes unknown content.
- **Forget & restore** — `references/forget-restore.md`: `forgetBlocks` block-aware deletion (stamped entries removed as a unit), UUIDv4 recovery records written before mutation, idempotent append-only restore.
- **Context builder** — `references/context-builder.md`: scratchpad > today > search > MEMORY.md > yesterday priority, per-section caps, 16K overall cap with `[truncated]` note.
- **Exit summary** — `references/exit-summary.md`: ≥4-message gate, model override, API-key resolution, `isExitSummaryEmpty` filter, self-imposed timeout, lifecycle-transition skip.
- **qmd transport** — `references/qmd-transport.md`: `buildQmdSpawn`/`buildQmdEnv` Windows shim bypass via `resolveQmdJsPath`, ANSI CSI/OSC stripping, JSON extraction, collection/context setup.
- **qmd search** — `references/qmd-search.md`: `runQmdSearch` mode→subcommand map, `clampSearchLimit`, result shaping, `need embeddings` self-heal, `searchRelevantMemories` 3s race.
- **qmd lifecycle** — `references/qmd-lifecycle.md`: `detectQmd`/`checkCollection` TTL caching (positive 5m, negative 5s), `ensureQmdEmbed` in-flight dedup + pending queue, `scheduleQmdUpdate` 500ms debounce.
- **Snapshot** — `references/snapshot.md`: `PI_MEMORY_SNAPSHOT=stable|per-turn`, refresh on session_start/compact/long-term-write/day-rollover, byte-stable systemPrompt, dirty flag.
- **Tool surface** — `references/tool-surface.md`: memory_write/read/forget/restore/search + scratchpad + memory_status tools and the seven `pi.on` lifecycle hooks.

## Extending the foundation
Add one `references/<seam>.md` capsule for one graph-selected, source-confirmed porting question. Add one matching loader line and map entry; keep evidence in the capsule, not this leaf. Each new capsule must carry Path/Symbol, Signature, Data Shape, a labelled decisive source excerpt, Flow, Invariant, a direct-test Probe, and a `search_graph` Retrieve.

## Provenance
pi-memory (MIT, `main@39e6b998a2279c8fad4a2c6c64e26828c1d6023e`); Codebase Memory project `pi-memory` (fast index: 334 nodes / 765 edges, indexed 2026-08-15). Direct tests are excluded by design (`fast-pattern` skip-list); cited source file `index.ts` reports `no_recorded_issue` with `freshness: missing` (best-effort — read source to confirm shipped claims).

## Full view (memory graph)
Revalidate `pi-memory` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source and direct tests decide shipped claims. The index excludes `test/unit.test.ts`, `test/e2e.ts`, `test/qmd-cache.ts`, and `scripts/` by design, so direct-test probes are named from the on-disk files but are not graph-covered.

## Boundaries
Adopt the plain-Markdown memory contract, the local-calendar date helpers, the line-preserving scratchpad mutations, the block-aware forget with durable recovery records, the byte-stable KV-cache snapshot, and the qmd keyword/semantic/deep search lifecycle. Adapt the memory directory layout, char/line caps, env-var names, qmd collection name, and the exact timestamp-comment regex to the host. Omit the Pi extension wiring (`index.ts` default export, `pi.on` hooks, `pi.registerTool` calls) and the qmd vendor integration unless a target needs them.
