---
name: mcp-ts-sdk-foundation
description: "Use when building MCP servers/clients: dual-era protocol classification, JSON-RPC correlation with progress-aware timeouts, versioned wire codecs, and capability-gated requests."
disable-model-invocation: true
---

# MCP TS SDK Foundation

## Solves
How the Model Context Protocol's official TypeScript SDK implements the protocol itself: serving two protocol eras on one endpoint without breaking legacy clients, correlating requests/timeouts/progress, and shipping schema revisions as code-generated codec layers.

## When to use
Building MCP servers or clients, JSON-RPC transports, protocol-version migration strategies, or request-correlation layers.

## Key skill-lines
- Two protocol eras on one endpoint -> body-primary classification with envelope claims; headers cross-check only; malformed claims never silently fall back (`references/protocol.md`).
- Request plumbing -> the Protocol base class: per-id response/progress/timeout maps, resetTimeoutOnProgress + maxTotalTimeout, opt-in remote-capability enforcement, tick-coalesced notifications.
- Protocol revisions -> generated wire codecs per spec revision (`rev2025-11-25`, `rev2026-07-28`) selected via `codecForVersion`; error codes derived from the published conformance suite.

## Full view (memory graph)

Indexed in Codebase Memory as **`typescript-sdk`** (`/mnt/hdd/utopia/inspo/typescript-sdk`). 4,346 nodes / 15,001 edges; packages: core-internal (975), client (382), server (353), conformance, middleware.

- `codebase_memory_get_architecture({ project: "typescript-sdk", aspects: ["overview", "entry_points", "hotspots"] })`
- `codebase_memory_search_graph({ project: "typescript-sdk", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "typescript-sdk", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/protocol.md` — the inbound ladder decision table, Protocol base internals, wire-codec era layering.

## Skill Result Contract

```xml
<skill_result>
  <skill>mcp-ts-sdk-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Legacy breakage, silent era fallback, unbounded timeout extension, or none</risks>
</skill_result>
```