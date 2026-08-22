---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent harness: live steering, interruptible tool batches, result pairing, queue ownership, compaction cuts, and cache-aware context reduction."
disable-model-invocation: true
---
# Oh My Pi Foundation

## Solves

Oh My Pi provides production-tested contracts for the seam between provider streams, tool execution, live user input, durable history, and context reduction.

## Reuse map

- **Steering during tools** — adapt `checkSteering` and `executeToolCalls` in `packages/agent/src/agent-loop.ts:2220-2719`; preserve non-consuming queue checks and separate hard/soft abort channels. Probe: `agent-loop.test.ts:1674` and `1746`.
- **Tool-result hardening** — adopt `coerceToolResult` at `packages/agent/src/agent-loop.ts:436-510`; malformed results become valid, non-empty error messages before provider serialization. Probe: `agent-loop.test.ts:4629`.
- **Completed-work retention** — adapt `retainCompletedToolCalls` at `packages/agent/src/agent-loop.ts:1900-1925`; interrupted partials retain only paired completed calls. Probe: `agent-loop.test.ts:727`.
- **Queue-owning facade** — adapt `Agent.prompt`, `continue`, `steer`, and `followUp` in `packages/agent/src/agent.ts:973-1260`; steering wakes the active run, follow-ups wait for the next boundary. Probe: `continue-empty-transcript.test.ts:14-55`.
- **Legal context cuts** — adopt `findValidCutPoints`/`findCutPoint` in `packages/agent/src/compaction/compaction.ts:540-686`; never begin retained history at a tool result. Probe: compaction tests plus `compaction-reserve-provenance.test.ts:13-92`.
- **Cache-aware reduction** — adapt `pruneSupersededToolResults`, `pruneToolOutputs`, and `collectShakeRegions`; protect recovery-bearing results and invalidate token caches after mutation. Probes: `supersede-prune.test.ts:136-638`, `shake.test.ts:72-235`, `tool-protection.test.ts:53-78`.

## Full view (memory graph)

Codebase Memory project **`oh-my-pi`**: `/mnt/hdd/utopia/inspo/oh-my-pi`, branch `main`, commit `45e12e5`, fast index, 84,012 nodes / 374,075 edges. Core agent sources report metadata matches; tests are excluded by fast-pattern and must be read directly.

Before porting, rerun `index_status`, coverage for cited paths, bounded `search_graph`, `trace_path`, then `get_code_snippet`. Confirm moved symbols against source.

## References

- `references/agent-loop.md` — provider/tool loop, steering, pairing, and soft requirements.
- `references/agent-wrapper.md` — prompt/continue ownership, queues, pause, replay, and append-only context.
- `references/compaction-suite.md` — thresholds, legal cuts, estimates, prune/shake, and protection.
- `references/replay-and-occupancy.md` — honest occupancy, provider-native replay compatibility, fallback, abort, and archive migration.

## Adopt / adapt / omit

Adopt pure boundary helpers and tested invariants. Adapt provider dialects, queue attribution, and storage types. Omit Oh My Pi-specific telemetry, Cursor transport handling, and remote-compaction wire formats unless the target has the same provider contract.

## Unmined

Rust `pi-walker`/`pi-builtins`, `pi-shell` minimizer, coding-agent UX/TUI, provider adapters, and remote compaction transports remain separate future crowns.

## Skill Result Contract

```xml
<skill_result>
  <skill>oh-my-pi-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Fresh graph trace, path coverage, exact source symbols, named direct-source probes</evidence>
  <artifacts>Selected harness primitive and port-specific verification plan</artifacts>
  <risks>Fast-index test exclusion, provider coupling, stale graph, or none</risks>
</skill_result>
```
