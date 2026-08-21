---
name: openai-agents-foundation
description: "Use when building multi-agent frameworks: guardrail tripwires running parallel to generation, typed handoffs with history filtering, and serializable human-in-the-loop run state."
disable-model-invocation: true
---

# OpenAI Agents Foundation

## Solves
The reference Python agent framework's three hardest patterns: safety checks that don't add latency, agent-to-agent delegation with controllable history, and runs that survive process death while waiting for human approval.

## When to use
Building agent frameworks, multi-agent routing, approval workflows, or resumable long-running agent processes.

## Key skill-lines
- Safety without latency -> guardrails run IN PARALLEL with generation; tripwires raise exceptions (impossible to ignore), not return values (`references/patterns.md` §1).
- Agent-to-agent -> handoffs as strict-schema TOOLS; `input_items` diverges next-agent input from session history; redaction-aware error propagation (`references/patterns.md` §2).
- Human-in-the-loop -> RunState serializes the entire run including tool-identity keys; approvals resume across process restarts (`references/patterns.md` §3).
- Loop hygiene -> run_internal/ splits preparation/planning/execution/approvals/streaming into named modules with tracing spans at every boundary.

## Full view (memory graph)

Indexed in Codebase Memory as **`openai-agents-python`** (`/mnt/hdd/utopia/inspo/openai-agents-python`). 28,011 nodes / 202,610 edges.

- `codebase_memory_get_architecture({ project: "openai-agents-python", aspects: ["overview", "entry_points", "hotspots"] })`
- `codebase_memory_search_graph({ project: "openai-agents-python", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "openai-agents-python", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/patterns.md` — guardrails, handoffs, RunState, loop decomposition.

## Skill Result Contract

```xml
<skill_result>
  <skill>openai-agents-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Ignored tripwires, leaked handoff context, unresumable approvals, or none</risks>
</skill_result>
```