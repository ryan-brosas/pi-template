---
name: roo-foundation
description: "Use when building IDE-embedded coding agents: mode-orchestrated personas with filtered tool surfaces, mistake-limit circuit breakers, pure auto-approval classifiers, and per-task shadow checkpoints."
disable-model-invocation: true
---
# Roo Foundation

## Solves
How a VS Code-embedded autonomous agent structures its core: one Task god-object tamed by promise gates, an explicit request stack, consecutive-mistake circuit breakers that escalate to humans, data-driven mode personas with cached tool filtering, and a pure auto-approval classifier.

## When to use
Building IDE extensions, autonomous agents with human approval gates, multi-persona tool routing, or checkpoint/undo systems for AI edits.

## Key skill-lines
- Late async config -> promise gates next to every late field (taskModeReady/taskApiConfigReady); access routed through readiness, races impossible by construction (`references/task-loop.md`).
- Runaway loops -> consecutiveMistakeLimit escalates to the human with a guidance channel and RESETS on their answer; ToolRepetitionDetector blocks identical canonical-JSON calls at 3 and resets on intervention (`references/task-loop.md`, `references/approvals.md`).
- Personas -> modes as data (roleDefinition + whenToUse + tool groups) advertised in the system prompt; alias-group tool filtering with cached renamed definitions (`references/modes.md`).
- Approvals -> checkAutoApproval as a PURE four-way classifier (approve/deny/ask/timeout-with-resume), per-server MCP allowlists, followup timeout auto-answer (`references/approvals.md`).
- Undo -> RepoPerTaskCheckpointService: shadow git repo per task over the real worktree.

## Capsule map

### Task loop
- Promise-gated late config, consecutive-mistake circuit breaker, per-repo checkpoint undo — `references/task-loop.md`.
### Modes & approvals
- Data-driven personas, cached tool filtering, pure auto-approval classifier, MCP allowlists — `references/modes.md`, `references/approvals.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`Roo-Code`** (`/mnt/hdd/utopia/inspo/Roo-Code`). 36,333 nodes / 77,100 edges; 1,555 TS files; core packages: src (1,593), core (1,111), cli (759).

- `codebase_memory_get_architecture({ project: "Roo-Code", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "Roo-Code", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "Roo-Code", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/task-loop.md` — Task structure, promise gates, recursive request stack, mistake circuit breaker, subtask delegation, context-window policy.
- `references/modes.md` — mode configs, system-prompt advertisement, alias-group tool filtering with rename caches, composable prompt sections.
- `references/approvals.md` — pure auto-approval classifier, repetition detector, shadow checkpoints, say/ask UI protocol.

## Skill Result Contract

```xml
<skill_result>
  <skill>roo-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Runaway loops, race conditions on late config, approval bypass, or none</risks>
</skill_result>
```