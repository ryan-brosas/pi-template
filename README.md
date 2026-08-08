# pi.dev Fabric Template

Fabric-first pi.dev project template: a curated catalog of Ultra-Fabric workflow
skills (sourced from pi-core), thin prompt commands, an honest extension, and
optional Exa/DeepWiki MCP guidance — all built to assist Ultra Fabric's research
prewalk lifecycle, never to replace it.

## Skills catalog

Curated, provenance-tracked skills under `.pi/skills/` (see `docs/sources.md`):

- **planning**: `brainstorming`, `spec-driven-development`, `using-git-worktrees`
- **execution**: `test-driven-development`, `testing-anti-patterns`,
  `typescript-coding-standards`, `api-and-interface-design`
- **recovery**: `debugging-and-error-recovery`, `verification-before-completion`,
  `agent-code-quality-gate`
- **fabric/agents**: `capability-delegation`, `agent-observability`,
  `agent-supervision`, `writing-skills`

Every skill keeps a source annotation (pi-core path) and is adapted only at the
prewalk lifecycle seams. Drift from source is checked by `npm run validate:sources`.

## Workflow catalog

Five workflow contracts under `.pi/skills/workflow-*/` adapted from the
opencode-template lifecycle: `workflow-lifecycle`, `workflow-deep-research`,
`workflow-audit`, `workflow-batch-implement`, `workflow-gc`. They define the
read-only roles (`scout`, `explore`, `plan`, `review`) and the single mutating
role (`build`, the executor after prewalk handoff).

## Ultra Fabric lifecycle

Prewalk is the sole progression authority:

1. **Research** — scout/explore; read-only evidence for the schema.
2. **Checklist** — schema-backed items (5-9) submitted to prewalk.
3. **Acceptance** — mutation is blocked until the checklist is accepted.
4. **Handoff** — the executor owns implementation and verification.
5. **Verification** — review runs refs/cascade, scope diff, and the gate.

Nothing in this template mutates before acceptance or bypasses the checklist.

## MCP and external research

- MCP servers are executed by the host MCP bridge (mcporter) and exposed as host
  tools: `mcp.$search` and `mcp.$call` (also reachable from Fabric runs via
  `tools.search` / `tools.call`). The template extension only reports status and
  returns guidance — it never dispatches or fabricates MCP calls.
- Optional providers: copy `mcp/exa.example.json` / `mcp/deepwiki.example.json`
  to `.mcporter/config.json`; secrets come from the environment only
  (`.env.example`). `mcp_guidance` reports ready/degraded servers and the exact
  host tools to call.

## Installation

1. Clone or copy the template.
2. `npm install` (typecheck tooling + the extension's `typebox` dep).
3. Start pi in the project, trust it, and `/reload`.
4. `/workflow` for status; `/research`, `/create`, `/implement`, `/fix`,
   `/audit`, `/review`, `/gc` to enter each phase.

A clean-install smoke test is available: `npm run smoke:install`.

## Verification

| Command | Purpose |
| --- | --- |
| `npm run validate:skills` | skill catalog (>=12, frontmatter, provenance) |
| `npm run validate:workflows` | five workflow contracts + role boundaries |
| `npm run validate:prompts` | seven thin commands paired to skills |
| `npm run validate:mcp` | both/one/none MCP routing + guidance refs |
| `npm run validate:sources` | manifest sources + vendor hashes + provenance doc |
| `npm run validate:config` | Fabric prewalk config + runtime-state exclusions |
| `npm run validate:structure` | required files and README sections |
| `npm run scan:secrets` | no committed secrets |
| `npm run typecheck` | strict TS check of the extension |
| `npm test` | skills-catalog, workflow-routing, prewalk-contract, mcp-guidance, source-drift, template-smoke, extension |
| `npm run smoke:install` | clean temporary install + discovery proof |
| `npm run check` | the full repository gate (all of the above) |

## Customization

- Add a skill under `.pi/skills/<name>/SKILL.md`; add it to
  `sources/manifest.json` when it is curated from pi-core/opencode-template.
- Prompts stay thin: they select a skill/workflow and defer to prewalk.
- The extension reports host status only; keep it mutation-free.
