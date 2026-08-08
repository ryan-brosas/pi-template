# pi.dev Fabric Template

Fabric-first pi.dev project template: concrete skills, thin prompt templates, a
minimal extension, and optional Exa/DeepWiki MCP that **assist** Ultra Fabric's
research-prewalk lifecycle instead of replacing it.

## What this is

```
.
├── .pi/
│   ├── fabric.json            # Ultra Fabric config (research prewalk, gated)
│   ├── skills/                # research, implementation, testing, review
│   ├── prompts/               # thin entry points (research, implement, test, review)
│   └── extensions/workflow.ts # workflow status + MCP dispatch adapter
├── mcp/                       # exa + deepwiki example server configs (optional)
├── scripts/                   # validators, secret scan, clean-install smoke test
├── tests/                     # prewalk-contract, mcp-routing, template-smoke, extension
└── docs/                      # architecture, operators, verification
```

## Architecture

Responsibility split, enforced by this template:

- **Prewalk (Ultra Fabric)** — the progression authority. Research, schema-backed
  checklist acceptance, handoff, and verification gates. Mutation is blocked
  until the checklist is accepted (see `.pi/fabric.json`).
- **Skills** — procedural guidance loaded on demand. They shape *how* research,
  implementation, testing, and review happen; they never authorize progression.
- **Prompts** — thin entry points that invoke a skill and defer to prewalk.
- **Extension** — host-only behavior markdown cannot provide: a `/workflow`
  status command and `mcp_invoke`/`mcp_capabilities` tools that validate and
  dispatch through the existing host MCP bridge.
- **MCP** — optional provider configuration (Exa, DeepWiki) with credentials
  from the environment only, and a generic `mcp.$search` fallback.

See `docs/architecture.md` for the full decision record.

## Prewalk lifecycle

1. **Research** — map scope, gather goal-backward evidence (skills/prompts guide).
2. **Checklist** — a schema-backed checklist (5-9 items with validations) is
   submitted to prewalk.
3. **Acceptance** — mutation is blocked until the checklist is accepted.
4. **Handoff** — the executor owns implementation and verification.
5. **Verification** — structural review (refs/cascade, scope diff, gate) before
   completion is claimed.

Nothing in this template mutates before acceptance or bypasses the checklist.

## Installation

1. Clone or copy the template into a new project.
2. `npm install` (installs typecheck tooling + the extension's `typebox` dep).
3. Start pi in the project and trust the project.
4. Run `/reload` so the project extension and skills are discovered.
5. Run `/workflow` to confirm status; use `/skill:research` and friends to run
   the workflow skills.

A clean-install smoke test is available: `npm run smoke:install`.

## MCP

Both providers are optional; the template degrades gracefully and keeps generic
Fabric MCP search (`mcp.$search`) as fallback.

1. Copy `mcp/exa.example.json` (and/or `mcp/deepwiki.example.json`) to
   `.mcporter/config.json` and merge as needed.
2. Copy `.env.example` to `.env` and fill the keys; load them into the
   environment before starting pi.
3. Reload pi; `mcp_capabilities` will report ready/degraded providers.

Missing providers produce actionable errors from `mcp_invoke`; no secrets are
ever committed. See `docs/operators.md`.

## Verification

| Command | Purpose |
| --- | --- |
| `npm run validate:structure` | required files, README headings |
| `npm run validate:config` | Fabric prewalk config + runtime-state exclusions |
| `npm run validate:skills` | 4 skills with frontmatter and lifecycle phrases |
| `npm run validate:prompts` | 4 thin prompts paired to skills |
| `npm run validate:mcp` | both/one/none provider routing |
| `npm run scan:secrets` | no committed secrets |
| `npm run typecheck` | strict TS check of the extension |
| `npm test` | prewalk-contract, mcp-routing, template-smoke, extension suites |
| `npm run smoke:install` | clean temporary install + discovery proof |
| `npm run check` | the full repository gate (all of the above) |

## Customization

- Add a skill: `.pi/skills/<name>/SKILL.md` (frontmatter `name` + `description`).
- Add a prompt: `.pi/prompts/<name>.md` (thin, defers to prewalk).
- Add an MCP server: another entry in `.mcporter/config.json`; add its env keys
  to `.env.example`.
- Extend the extension only for host-only behavior; keep skills as the guidance
  surface and prewalk as the authority.
