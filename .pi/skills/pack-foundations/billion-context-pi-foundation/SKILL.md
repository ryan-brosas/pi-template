---
name: billion-context-pi-foundation
description: "Use when building long-context agent delegation: subagent spawning, context compress/decompress, tool guardrails, delegate watchdogs, and fleet status widgets."
disable-model-invocation: true
---

# Billion-Context-Pi Foundation

## Solves
Long-context agent delegation: subagent spawning with restricted tool allowlists, message-range compression, and a watchdog that guarantees a hung child dies.

## When to use
Building long-context agent delegation, subagent spawning, context compress/decompress, or delegate watchdogs.

## Key skill-lines
- Subagent delegation -> the roster + restricted-tools pattern: named AgentDefs (reviewer/researcher/worker/planner/oracle), read-only roles on "read,bash,grep,find,ls", implementer keeps full tools, ACP context tools auto-appended.
- Guarantee a spawned child dies -> `attachWatchdogs`: idle timer (main), hard timeout, EOF grace, SIGTERM->SIGKILL.
- Deliver async results exactly once -> parked waiter XOR injected notification, deduped by `injected`/`consumed` flags; status+result flip atomically.
- Message-range compression -> compress/decompress with mNNNNN refs + dense summaries; never compress live content.
- Cap tool output -> `capToolOutput` with a named dropped-bytes notice.

## Capsule map

### Subagent delegation
- AgentDefs roster + restricted-tools patterns, watchdog attach (idle/hard/EOF/SIGTERM→SIGKILL), exactly-once async delivery — `references/delegation.md`, `references/watchdog.md`.
### Context compression & UX
- Message-range compress/decompress with mNNNNN refs, capToolOutput dropped-bytes notice, fleet status — `references/compression.md`, `references/ux.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`billion-context-pi`** (`/mnt/hdd/utopia/inspo/billion-context-pi`, branch `master`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "billion-context-pi", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "billion-context-pi", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "billion-context-pi", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "billion-context-pi", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — architecture map, tool guardrails (vendored isBashToolResult lesson), fleet widget, red flags, verification.
- `references/delegation.md` — the roster + restricted tools: AgentDef, the MAX_DEPTH gate, sync/async wait timeouts.
- `references/watchdog.md` — attachWatchdogs: idle timer (main defense), hard timeout, EOF grace, SIGTERM→SIGKILL escalation.
- `references/compression.md` — compress/decompress: message-range addressing (mNNNNN / bN), summary limits, token accounting.
- `references/ux.md` — the delegate fleet status widget: render-key debounce, idle timer shutdown, mode guards.

## Skill Result Contract

```xml
<skill_result>
  <skill>billion-context-pi-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Delegation pattern ported, provenance cited, verified</evidence>
  <artifacts>Delegate roster + watchdog + compress</artifacts>
  <risks>Hung child, leaked tools, live-content compression, or none</risks>
</skill_result>
```
