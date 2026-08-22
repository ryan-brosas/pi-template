---
name: pi-upstream-foundation
description: "Use when building a coding-agent harness: the agent loop (start/continue), branch-summarization compaction, context-token estimation, and the cut-point logic."
disable-model-invocation: true
---

# Pi Upstream Foundation

## Solves
The upstream Pi coding-agent: agent loop, TUI, session backends, protocol. Two things to mine: the agent loop and the compaction pipeline (the sharpest context-management design).

## When to use
Building a coding-agent harness: agent loop, branch-summarization compaction, token estimation, cut-point logic.

## Key skill-lines
- Agent loop -> `packages/agent/src/agent-loop.ts`: AgentMessage throughout, convertToLlm only at the LLM boundary, agentLoop/agentLoopContinue as separate modes, enforce the continue precondition (last message user/toolResult).
- Context compaction -> `packages/agent/src/harness/compaction/compaction.ts`: shouldCompact (window - reserve) -> estimateTokens -> findCutPoint (keepRecent, turn-boundary-aware) -> generateSummary -> compact.
- Branch navigation summarization -> `branch-summarization.ts`: common-ancestor collection, newest-first budgeted selection, summary entries with readFiles/modifiedFiles.
- Settings manager -> `SettingsManager` (save/markModified, fan-in 46).
- Model catalog -> `flattenModelCatalog` + `createProvider`.

## Capsule map

### Agent loop
- AgentMessage-throughout, convertToLlm at the boundary, agentLoop/Continue modes, continue precondition — `references/internals.md`.
### Compaction & UX
- shouldCompact→estimate→cut-point→summary pipeline, branch summarization, session/TUI UX — `references/session.md`, `references/ux.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`pi-upstream`** (`/mnt/hdd/utopia/inspo/pi-upstream`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "pi-upstream", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "pi-upstream", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "pi-upstream", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "pi-upstream", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — compaction exports list, red flags, verification.
- `references/internals.md` — loop guards & steering, hybrid token estimation, cut-point rules, structured summary prompts, cache-isolated summarization calls.
- `references/ux.md` — TUI interaction internals in prose: input buffering, fuzzy matching, autocomplete, markdown, search, keybindings, editor.
- `references/session.md` — session persistence + steering: durable/temporary entry types, snapshot-driven steering messages, resize/variables channel.

## Skill Result Contract

```xml
<skill_result>
  <skill>pi-upstream-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Harness pattern ported, provenance cited, checks run</evidence>
  <artifacts>Ported pattern + path</artifacts>
  <risks>Context loss, mid-turn cut, missing continue mode, or none</risks>
</skill_result>
```
