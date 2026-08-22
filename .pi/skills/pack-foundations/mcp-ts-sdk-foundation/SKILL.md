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

## Capsule map

### Dual-era protocol
- Body-primary classification, per-id request plumbing, generated wire codecs per revision — `references/protocol.md`, `references/transports.md`.
### Auth & capability gating
- Auth flows, progress-aware timeouts, remote-capability enforcement — `references/auth.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`typescript-sdk`** (`/mnt/hdd/utopia/inspo/typescript-sdk`). 4,346 nodes / 15,001 edges; packages: core-internal (975), client (382), server (353), conformance, middleware.

- `codebase_memory_get_architecture({ project: "typescript-sdk", aspects: ["overview", "entry_points", "hotspots"] })`
- `codebase_memory_search_graph({ project: "typescript-sdk", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "typescript-sdk", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/protocol.md` — the inbound ladder decision table, Protocol base internals, wire-codec era layering.
- `references/auth.md` — SEP-2352 issuer-stamped credential isolation, discovery pipeline, scope step-up, callback validation, token-request chokepoint.
- `references/transports.md` — session lifecycle, store-first resumability with version-gated priming events, identity-checked stream teardown, reconnect predicate, content negotiation.

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