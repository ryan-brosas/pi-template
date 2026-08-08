# Architecture

Decision record for the pi.dev Fabric template.

## Why skills, not a new orchestrator

Ultra Fabric's prewalk already owns research, checklist acceptance, handoff, and
verification gates. Duplicating that orchestration in a template would fork the
lifecycle and weaken its guarantees. Instead the template provides:

1. **Skills** (procedural guidance, loaded on demand) — how to research,
   implement, test, and review *within* the prewalk lifecycle.
2. **Prompts** (thin entry points) — one command per phase that loads the
   matching skill and explicitly defers progression to prewalk.
3. **Extension** (host-only behavior) — markdown cannot register tools or
   commands, so a minimal TypeScript extension adds a status command and MCP
   capability/dispatch tools. It never mutates the workspace.
4. **MCP configuration** — optional providers (Exa, DeepWiki) as standard
   mcporter config fragments; credentials only from the environment; generic
   `mcp.$search` remains as fallback.

## Lifecycle contract

```
research -> schema-backed checklist -> acceptance -> handoff -> executor -> verification
```

- Mutation is blocked before acceptance (`.pi/fabric.json` prewalk
  `verificationMode: gated`, `arm: session`).
- The executor owns implementation and verification after handoff.
- Review reruns codemap refs/cascade on changed public symbols and confirms the
  changed-file scope before completion.

## Extension design

`.pi/extensions/workflow.ts` registers:

- `mcp_invoke` — validates server/tool/args against the mcporter config,
  checks required environment secrets, honors the AbortSignal (cancellation),
  and returns a dispatch plan for the host MCP bridge (`mcp.$call`). Missing or
  misconfigured providers produce actionable errors, never silent failure.
- `mcp_capabilities` — read-only provider status (ready/degraded/unknown).
- `/workflow` — status of prewalk config, skills, prompts, extensions, and MCP.

The extension has zero runtime imports beyond `typebox` and relative template
helpers, and performs no file writes.

## Shared logic

`scripts/template-lib.ts` is the single source of truth for MCP routing,
prewalk-contract validation (a mirror of Ultra Fabric's rules so the seam is
executable-testable), and secret scanning. Validators, tests, and the extension
all import it.

## Secrets

- Example configs reference env vars as `${EXA_API_KEY}` /
  `${DEEPWIKI_API_KEY}`; the environment is the only source of values.
- `.env.example` ships with empty values; `scan:secrets` fails the gate if
  any assignment carries a value.
