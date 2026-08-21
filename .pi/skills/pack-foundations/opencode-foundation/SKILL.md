---
name: opencode-foundation
description: "Use when building client/server coding-agent harnesses: shadow-git snapshot undo, deferred-suspension permission models, protocol-first API codegen, and multi-surface clients."
disable-model-invocation: true
---

# OpenCode Foundation

## Solves
A production coding-agent monorepo: the agent engine (`packages/opencode`), a protocol-generated server, and many clients (TUI/web/desktop/IDE) over one API — plus the two hardest agent problems done well: undoing AI edits and gating tool calls on humans.

## When to use
Building client/server agent architectures, edit-undo systems, permission/approval flows, or Effect-TS service layers.

## Key skill-lines
- Undo for AI edits -> the shadow-git snapshot: per-worktree hidden repo with SHARED object database via alternates; ignore-drift correction; 7-day gc (`references/snapshot.md`).
- Tool-call gating -> the permission model: last-match-wins rulesets, fail-toward-asking, Deferred-suspended requests, rejection text as CorrectedError feedback (`references/permissions.md`).
- Multi-surface architecture -> protocol-first codegen: `@opencode-ai/protocol` defines the API once; `makeDefaultApi` generates the server; TUI/web/desktop are thin clients.
- Effect-TS layering -> services as `Context.Service` + `Layer.effect` with InstanceState per directory; every external failure degrades to logWarning, never aborts the task.

## Full view (memory graph)

Indexed in Codebase Memory as **`opencode`** (`/mnt/hdd/utopia/inspo/opencode`). 64,850 nodes / 234,775 edges; engine packages: opencode (5,144), core (2,319), tui (1,339), server, protocol, sdk.

- `codebase_memory_get_architecture({ project: "opencode", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })`
- `codebase_memory_search_graph({ project: "opencode", query: "<symbol>" })`
- `codebase_memory_trace_path({ project: "opencode", ... })`
- `codebase_memory_check_index_coverage({ project: "opencode", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/snapshot.md` — shadow-git undo: alternates seeding, exclude syncing, NUL pathspecs, semaphore locking.
- `references/permissions.md` — ruleset evaluation, Deferred suspension, rejection-as-feedback, session-scoped approval growth.

## Skill Result Contract

```xml
<skill_result>
  <skill>opencode-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Broken revert, permission bypass, stale async state, or none</risks>
</skill_result>
```