---
name: linkedin-mcp-foundation
description: "Use when building LinkedIn automation or an MCP server over a logged-in browser: session-state persistence, cross-platform profile reuse, daemon ownership/lock, config validation, and the tool surface."
disable-model-invocation: true
---
# LinkedIn MCP Foundation

## Use this for
Automation or an MCP server over a logged-in browser: persistent session state, cross-platform profile reuse, daemon ownership with lock/lease, validated config, and a tool surface. Source and tests are the contract; references carry decisive excerpts and retrieval.

## Load the matching source dump
- `references/session-state.md` — SourceState/RuntimeState files, portable_cookie_path, canonical() everywhere, conservative container detection.
- `references/daemon-trust.md` — daemon_lock/profile_lease/descriptor trust, FastMCP + DI + singleton driver, validated BrowserConfig.
- `references/ux.md` — the Docker login-viewer UX: preflight-with-remedies, token-private noVNC, layered readiness probes.

## Capsule map
- **Session persistence** — `references/session-state.md`: canonical paths, container detection, rotation/quarantine/restore, Chromium lock attribution.
- **Daemon trust & UX** — `references/daemon-trust.md`, `references/ux.md`: lock-vs-lease, keyed-fingerprint descriptors, election arbitration, validated dashboard.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory under `linkedin-mcp-server` (`/mnt/hdd/utopia/inspo/linkedin-mcp-server`); source and its direct tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt persistent session state, daemon lock/lease trust, validated config, and the browser-session tool surface; adapt storage paths and container detection; omit site-specific automation flows unless a target requires them.
