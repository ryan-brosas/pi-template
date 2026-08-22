---
name: browser-use-foundation
description: "Use when building an LLM-driven browser agent: the agent step loop, DOM accessibility-tree serialization, message compaction, tool registry with sensitive-data redaction, and CDP browser sessions."
disable-model-invocation: true
---

# Browser-Use Foundation

## Solves
The reference LLM browser agent: serialize the DOM the LLM can act on, run a step loop, let the model call typed tools. Sharpest parts: the step loop's exception containment, DOM accessibility-tree snapshot, message compaction, sensitive-data redaction.

## When to use
Building an LLM-driven browser agent.

## Key skill-lines
- LLM browser agent -> the step loop: prepare context -> get next action -> execute -> post-process -> finalize, with one handler + a finally, clear per-step state before the LLM call.
- DOM the LLM can act on -> serialize the CDP accessibility tree into EnhancedDOMTreeNode/SerializedDOMState; visibility from all parents + viewport ratio; handle cross-origin iframes.
- Agent-context compaction -> maybe_compact_messages: DUAL gate (every-N-steps cadence AND a 40k-char floor), anti-hallucination summarizer prompt ("never infer completion"), first+last-N history retention.
- Typed tool registry -> Registry + @action decorator -> pydantic param model -> typed union; redact secrets to placeholders.
- Reuse a real browser profile -> from_system_chrome / list_chrome_profiles.

## Capsule map

### Agent step loop
- prepare/get-action/execute/post-process flow, exception containment, per-step state reset — `references/agent-step-loop.md`.
### DOM & context
- CDP accessibility-tree serialization, dual-gate message compaction, typed tool registry with redaction — `references/dom-serialization.md`, `references/tools-compaction.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`browser-use`** (`/mnt/hdd/utopia/inspo/browser-use`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "browser-use", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "browser-use", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "browser-use", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "browser-use", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — architecture map, browser session API, MCP exposure, red flags, verification.
- `references/agent-step-loop.md` — the step loop phases, exception containment, per-step state clearing.
- `references/dom-serialization.md` — accessibility-tree snapshot, visibility from all parents, cross-origin iframes.
- `references/tools-compaction.md` — Registry + @action sensitive-data handling and MessageCompactionSettings.

## Skill Result Contract

```xml
<skill_result>
  <skill>browser-use-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Agent pattern ported, provenance cited, verified</evidence>
  <artifacts>Step loop + DOM serializer + tool registry</artifacts>
  <risks>State leak, secret leak, broken DOM snapshot, or none</risks>
</skill_result>
```
