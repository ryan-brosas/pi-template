---
name: browser-use-foundation
description: "Use when building an LLM-driven browser agent: the agent step loop, DOM accessibility-tree serialization, message compaction, a tool registry with sensitive-data redaction, and CDP browser sessions."
disable-model-invocation: true
---
# Browser Agent Foundation

## Use this for
An LLM-driven browser agent that carries state through a step loop, serializes the DOM for the model, compacts conversational history, and gates tools with sensitive-data redaction. Source and direct tests are ground truth; references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/agent-step-loop.md` — the step loop phases, exception containment, per-step state clearing.
- `references/dom-serialization.md` — accessibility-tree snapshot, visibility from all parents, cross-origin iframes.
- `references/tools-compaction.md` — Registry + @action sensitive-data handling and MessageCompactionSettings.

## Capsule map
- **Agent step loop** — `references/agent-step-loop.md`: prepare/get-action/execute/post-process flow with exception containment and per-step state reset.
- **DOM & context** — `references/dom-serialization.md`, `references/tools-compaction.md`: accessibility-tree serialization, dual-gate message compaction, typed tool registry with redaction.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `browser-use` (`/mnt/hdd/utopia/inspo/browser-use`); source and its direct tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the step loop, accessibility serialization, compaction, and redacting registry contracts; adapt CDP session management and browser transport; omit multi-account/persistence and product-specific messaging unless a target requires it.
