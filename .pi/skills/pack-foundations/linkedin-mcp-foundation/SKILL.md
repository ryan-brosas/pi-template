---
name: linkedin-mcp-foundation
description: "Use when building LinkedIn automation or an MCP server over a logged-in browser: session-state persistence, cross-platform profile reuse, daemon ownership/lock, config validation, and the tool surface."
disable-model-invocation: true
---
---
name: linkedin-mcp-foundation
description: "Use when building LinkedIn automation or an MCP server over a logged-in browser: session-state persistence, cross-platform profile reuse, daemon ownership/lock, config validation, and the tool surface."
disable-model-invocation: true
---

# LinkedIn MCP Foundation

## Solves
An MCP server over a logged-in browser session. The single most instructive pattern: how to expose a logged-in browser as an MCP server — session persistence, daemon ownership, cross-platform profile reuse.

## When to use
Building LinkedIn automation or an MCP server over a logged-in browser.

## Key skill-lines
- Persist a logged-in browser session cross-platform -> port `session_state.py`: SourceState/RuntimeState files, portable_cookie_path, canonical() everywhere, conservative container detection with LINKEDIN_MCP_CONTAINER override.
- Daemon that owns a shared browser -> `daemon_lock.py` (process-lifetime, one-holder) + `profile_lease.py` (reference-counted, per-op) + `daemon_descriptor.py` (loopback-checked, keyed-fingerprint trust).
- MCP server over a browser -> FastMCP + @mcp.tool + Depends() DI + singleton driver + centralized raise_tool_error().
- Validated browser config -> `BrowserConfig.validate()` + env-driven `load_from_env` + repr=False secrets + keyed config fingerprint.

## Full view (memory graph)

Indexed in Codebase Memory as **`linkedin-mcp-server`** (`/mnt/hdd/utopia/inspo/linkedin-mcp-server`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "linkedin-mcp-server", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "linkedin-mcp-server", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "linkedin-mcp-server", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "linkedin-mcp-server", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — architecture map, lock-vs-lease rules, descriptor trust model, config validation, tool surface, red flags.
- `references/session-state.md` — the crown pattern in depth: canonical paths, container detection, rotation/quarantine/restore, Chromium lock attribution.
- `references/ux.md` — the Docker login viewer UX: preflight-with-remedies, token-private noVNC, layered readiness probes.

## Skill Result Contract

```xml
<skill_result>
  <skill>linkedin-mcp-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported from source, provenance cited, verified</evidence>
  <artifacts>Integration + auth flow + daemon</artifacts>
  <risks>Cookie exposure, broken lock/lease, fingerprint drift, or none</risks>
</skill_result>
```
