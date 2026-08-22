---
name: oh-my-pi-foundation
description: "Use when building or hardening an LLM agent loop: steering/asides injection, interruptible tool batches, soft tool requirement gate, Harmony-leak recovery, synthetic result pairing."
disable-model-invocation: true
---

# oh-my-pi Foundation

## Solves
Oh-my-pi: a production coding-agent harness. What it solves is separable into one crown: `agent-loop.ts`, 2,925 lines that decide which context reaches the provider, which tool calls may execute (when/order), what gets recorded when anything else happens, and how live user input lands without corrupting work. Port the decisions, not just the code.

## When to use
You are writing a model-to-tool harness: turn loops, streaming event contracts, steering/asides, tool batching + interrupts, pre-model gates, provider quirks (thinking eviction, protocol leakage), result hardening, synthetic-result pairing.

## Key skill-lines
- Agent loop engine => `packages/agent/src/agent-loop.ts` (2,925 lines)
- Event stream harness => `EventStream<AgentEvent, AgentMessage[]>` (agent-loop.ts:587)
- Interrupt model => interruptible vs non-interruptible signal split + steering soft-signal (agent-loop.ts:2220)
- Hardening/honing => `coerceToolResult` at the execute boundary + synthetic taxonomy (agent-loop.ts:436, 2763)
- Tests are probes => `packages/agent/test/agent-loop.test.ts` (5,124 lines)

## Full view (memory graph)
Oh-my-pi project: 84,012 nodes / 374,075 edges; agent-loop ranks 8/20 entry points; compactions, pi-walker fan-in 904, pi-builtins 713, pi-shell hotspot 419, coding-agent 439. Query more via Codebase Memory or a scratch trace.

## References (load when porting)
- reference/agent-loop.md — the finished full-file walk of agent-loop.ts (provenance + Lessons + Probes)
- (planned) compaction-suite.md, pi-walker.md, pi-builtins.md, pi-shell-minimizer.md, ux-surface.md

## Unmined (depth debt)
`packages/agent/src/{agent.ts,pause.ts,thinking.ts,tokenizer.ts,replay-policy.ts,proxy.ts,run-collector.ts,telemetry.ts}`; compaction tree; pi-walker/pi-builtins Rust; pi-shell; TUI/prompt/completions/install surface; test suites prompt-tools-loop, soft-tool-requirement.

## Skill Result Contract
Every recipe carries real path + line anchor; every behavioral claim names the repo's test that pins it.
