---
name: pi-upstream-foundation
description: "Use when building a coding-agent harness: the agent loop (start/continue), branch-summarization compaction, context-token estimation, and the cut-point logic."
disable-model-invocation: true
---
# Pi Upstream Foundation

## Use this for
Building a coding-agent loop: start/continue flow, branch-summarization compaction, context-token estimation, and cut-point logic. Source and tests are authoritative; references the decisive excerpts and state.

## Load the matching source dump
- `references/internals.md` — loop guards & steering, hybrid token estimation, cut-point rules, structured summary prompts.
- `references/ux.md` — TUI interaction internals: input buffering, autocomplete, markdown, search, keybindings, editor.
- `references/session.md` — session persistence + steering: durable/temporary entry types, snapshot steering messages.

## Capsule map
- **Agent loop** — `references/internals.md`: AgentMessage-throughout, convertToLlm at the boundary, agentLoop/Continue modes.
- **Compaction & UX** — `references/session.md`, `references/ux.md`: shouldCompact→estimate→cut-point→summary, TUI internals.

## Extending the foundation
Add one references-file capsule per seam (loader line, grouped map, decisive source, invariant, probe, retrieval).

## Provenance
Indexed in Codebase Memory as `pi-upstream` (`/mnt/hdd/utopia/inspo/pi-upstream`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the loop boundaries, hybrid token estimation, and cut-point/compaction contracts; adapt provider and terminal transport; omit site-specific CLI and TUI style unless a target requires them.