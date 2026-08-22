---
name: openai-agents-foundation
description: "Use when building multi-agent frameworks: guardrail tripwires running parallel to generation, typed handoffs with history filtering, and serializable human-in-the-loop run state."
disable-model-invocation: true
---
# OpenAI Agents Foundation

## Use this for
A multi-agent framework: guardrail tripwires racing generation, typed handoffs with history filtering, and serializable human-in-the-loop run state. Source and tests are the contract; references resolve to decisive excerpts, ladder, and state contracts.

## Load the matching source dump
- `references/patterns.md` — guardrails, handoffs, RunState overview, loop decomposition.
- `references/run-internals.md` — the resolution ladder, handoff arbitration, parallel-tool failure arbiter, resume reconciliation.
- `references/run-state.md` — versioned snapshot contract, approval ledger, parking/resume identity, hardened deserialization.

## Capsule map
- **Guardrails & handoffs** — `references/patterns.md`: parallel guardrail tripwires, strict-schema tool handoffs, history filtering.
- **Run state & loop** — `references/run-state.md`, `references/run-internals.md`: serializable HITL RunState and loop hygiene.

## Extending the foundation
Add one references-fileshaped capsule per seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `openai-agents-python` (`/mnt/hdd/utopia/inspo/openai-agents-python`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt guardrail parallelism, typed handoffs, and versioned run-state; adapt provider tool schemas and transports; omit sampling/API-key specifics unless a target requires them.