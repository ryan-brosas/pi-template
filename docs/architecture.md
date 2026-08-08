# Architecture

## Layers

Ultra Fabric prewalk is the progression authority. Around it the template adds
three layers:

1. **Triggerable skill packs** (`.pi/skills/packs/<pack>/<skill>/SKILL.md`). Pi
   discovers `SKILL.md` recursively, so every skill registers `/skill:<name>`
   and auto-loads from its description. `pack-router` maps packs to intents.
   - `delivery` — brainstorm, spec, TDD, worktrees, lifecycle/batch workflows.
   - `quality` — debugging, verification gate, quality gate, API/TS standards,
     audit/gc workflows.
   - `agents` — delegation, observability, supervision, skill authoring.
   - `research` — research-router + provider skills + deep-research workflow.
2. **Detailed research lanes** (see `docs/research-routing.md`): OmniRoute for
   general web/fetch, Context7 for library docs, DeepWiki for public-repo Q&A,
   codemap/CGC for code. Standalone Exa is retired; the legacy global MCP alias
   named `exa` is an OmniRoute endpoint and is documented as such.
3. **Thin prompts** (`.pi/prompts/`) — one command per phase that selects the
   right skill/workflow and defers progression to prewalk.

## Ultra Fabric lifecycle

```
research -> schema-backed checklist -> acceptance -> handoff -> executor -> verification
```

- Mutation is blocked before acceptance (`.pi/fabric.json` prewalk gated).
- Research (scout/explore) is read-only; only the executor (build) mutates
  after handoff and inside `localScope.files`.
- Review runs codemap refs/cascade and confirms the changed-file scope.

## Extension (provider-neutral status)

`.pi/extensions/workflow.ts` registers `workflow_status` and
`research_guidance` plus `/workflow`. It reads the project `.mcporter/config.json`
(or the global `~/.config/mcp/mcp.json`), reports provider status for
omniroute/context7/deepwiki (including the legacy `exa` alias), and returns the
exact host refs to call. It never executes research and never fabricates a
dispatch.

## MCP and research providers

- Servers are executed by the host MCP bridge (mcporter) and surfaced as host
  tools: `mcp.$search`, `mcp.$call`, plus the lane refs. From Fabric runs the
  same bridge is `tools.search` / `tools.call`.
- `mcp/omniroute.example.json` and `mcp/deepwiki.example.json` are the only
  examples; the standalone `exa` example and key are removed.

## Shared logic and provenance

`scripts/template-lib.ts` is the single source of truth: research lane routing
(`researchIntent`, `buildResearchGuidance`), provider status, prewalk-contract
mirror, frontmatter parsing, secret scanning, and hash/provenance helpers.

`sources/manifest.json` + `scripts/sync-sources.mjs` track every asset with
source path, hashes, and synth status across roots pi-core, opencode-template,
pi-agent, omniroute-fork, and pi-docs. `validate:sources` fails on drift.

## Secrets

- Example configs reference env vars only (`${CONTEXT7_API_KEY}`,
  `${DEEPWIKI_API_KEY}`); OmniRoute is a local endpoint and needs no key.
- `.env.example` ships with empty values; `scan:secrets` fails the gate on any
  assignment carrying a value.
