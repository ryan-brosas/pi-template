---
name: opencode-foundation
description: "Use when building client/server coding-agent harnesses: shadow-git snapshot undo, deferred-suspension permission models, protocol-first API codegen, and multi-surface clients."
disable-model-invocation: true
---
# OpenCode Foundation

## Use this for
Client/server coding-agent harnesses: shadow-git snapshot undo, a deferred-suspension permission model, protocol-first API codegen, and multi-surface clients. Source and tests are the contract; references resolve to decisive excerpts and flows.

## Load the matching source dump
- `references/snapshot.md` — shadow-git undo: alternates seeding, ignore-drift correction, semaphores, NUL pathspecs.
- `references/permissions.md` — ruleset evaluation, Deferred suspension, rejection-as-feedback, session-scoped approval.
- `references/sessions.md` — event-sourced persistence, fork-as-graph-rewrite, patch semantics, stream guards.
- `references/editing.md` — nine-replacer fuzzy edit chain, collision triad, locked edit transactions, four-pass applier.
- `references/write-tool.md` — permission-gated full-file write, BOM preservation, format re-sync, LSP feedback.
- `references/read-tool.md` — offset/limit paginated reads, `more` flag, directory listing.
- `references/grep-glob-tools.md` — ripgrep-backed content/file search, include filtering.
- `references/apply-patch-tool.md` — parse-verify-apply hunks, zero-hunk failure, trailing-newline guarantee.
- `references/task-tool.md` — subagent delegation, foreground/background modes, non-overlap guidance.
- `references/shell-tool.md` — bounded cross-platform shell, default timeout, safe env expansion.
- `references/truncate-tool.md` — line+byte-bounded output, spill-to-file with outputPath.
- `references/skill-tool.md` — name-based skill loading.
- `references/question-tool.md` — mid-turn user questions.
- `references/tool-schema.md` — Effect Schema → JSON Schema for tool params.
- `references/lsp-tool.md` — LSP diagnostics feedback loop.
- `references/web-tools.md` — webfetch + websearch.

## Capsule map
- **Shadow-git undo** — `references/snapshot.md`: per-worktree hidden repo, SHARED object DB via alternates, ignore-drift correction.
- **Permission model** — `references/permissions.md`: last-match-wins rulesets, defer-on-ask, Deferred suspension.
- **Sessions & editing** — `references/sessions.md`, `references/editing.md`: event-sourced persistence, fork-as-rewrite, replacer chain, locked edits.
- **The write path (tools)** — `references/write-tool.md`, `read-tool.md`, `apply-patch-tool.md`, `grep-glob-tools.md`: permission-gated write, paginated read, patch apply, ripgrep search.
- **Execution & delegation** — `references/shell-tool.md`, `task-tool.md`, `truncate-tool.md`: bounded shell, subagent delegation, spill-to-file truncation.
- **Model-facing helpers** — `references/skill-tool.md`, `question-tool.md`, `tool-schema.md`, `lsp-tool.md`, `web-tools.md`: skill loading, user questions, schema conversion, LSP feedback, web access.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, direct-test probe, and `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `opencode` (`/mnt/hdd/utopia/inspo/opencode`); 64,850 nodes / 234,775 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt shadow-git undo, deferred-suspension permissions, event-sourced sessions, and the tool write-path; adapt the client surfaces and transport; omit site-specific TUI and per-cli behavior unless a target requires it.
