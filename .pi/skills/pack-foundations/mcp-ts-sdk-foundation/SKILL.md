---
name: mcp-ts-sdk-foundation
description: "Use when building MCP servers/clients: dual-era protocol classification, JSON-RPC correlation with progress-aware timeouts, versioned wire codecs, and capability-gated requests."
disable-model-invocation: true
---
# MCP TS SDK Foundation

## Use this for
MCP servers and clients: dual-era protocol classification, per-message JSON-RPC correlation with progress-aware timeouts, versioned wire-codecs, and capability-gated requests. Source and tests are the contract; references resolve to decisive excerpts and retrieval.

## Load the matching source dump
- `references/protocol.md` — the inbound ladder decision table, Protocol base internals, wire-codec era layering.
- `references/auth.md` — SEP-2352 issuer-stamped credential isolation, discovery, scope step-up, token-request enforcement.
- `references/transports.md` — session lifecycle, store-first resumability, identity-checked teardown, reconnect rule, content negotiation.

## Capsule map
- **Dual-era protocol** — `references/protocol.md`, `references/transports.md`: body-primary classification, per-id request plumbing, generated wire codecs per revision.
- **Auth & capability gating** — `references/auth.md`: issuer-stamped isolation, progress-aware timeouts, remote-capability enforcement.

## Extending the foundation
Add one references-fileshaped capsule per new seam: one line in the loader, one grouped map reference, decisive source, invariant, direct probe, and retrieval.

## Provenance
Indexed in Codebase Memory as `typescript-sdk` (`/mnt/hdd/utopia/inspo/typescript-sdk`); 4,346 nodes / 15,001 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt dual-era classification, per-id correlation, and capability gating; adapt transport and auth providers; omit the wire/CLI generation and test harness internals unless porting them directly.