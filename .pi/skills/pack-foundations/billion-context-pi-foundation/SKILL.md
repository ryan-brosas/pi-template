---
name: billion-context-pi-foundation
description: "Use when building long-context agent delegation: subagent spawning, context compress/decompress, tool guardrails, delegate watchdogs, and fleet status widgets."
disable-model-invocation: true
---
# Billion-Context-Pi Foundation

## Use this for
Long-context agent delegation: spawning child agent processes with restricted tool allowlists, compressing message ranges, and guaranteeing a hung child dies. Billion-Context-Pi source and direct tests are ground truth; the capsules carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/delegation.md` — the roster + restricted tools: AgentDef, the MAX_DEPTH gate, sync/async wait timeouts.
- `references/watchdog.md` — attachWatchdogs: idle timer (main defense), hard timeout, EOF grace, SIGTERM→SIGKILL escalation.
- `references/compression.md` — compress/decompress: message-range addressing, summary limits, token accounting.
- `references/ux.md` — the delegate fleet status widget: render-key debounce, idle timer shutdown, mode guards.

## Capsule map
- **Subagent delegation** — `references/delegation.md`, `references/watchdog.md`: AgentDefs roster with restricted read-only tool allowlists, watchdog attach (idle/hard/EOF/SIGTERM→SIGKILL), guaranteed child termination.
- **Context compression & UX** — `references/compression.md`, `references/ux.md`: message-range compress/decompress with mNNNNN refs, tool-output capping with a dropped-bytes notice, fleet status.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `billion-context-pi` (`/mnt/hdd/utopia/inspo/billion-context-pi`); 405 nodes / 1,005 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the restricted-allowlist roster, watchdog escalation, exactly-once async delivery, and message-range compression contracts; adapt child-process transport and host tool names; omit repo-specific event/token plumbing unless a target requires it.
