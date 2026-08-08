# Operators guide

## Start

1. `npm install`
2. `pi` from the project root; trust the project.
3. `/reload` to discover packs, skills, prompts, and the extension.
4. `/workflow` for status: prewalk config, skill packs, providers.

## Triggering skills

- **Direct:** `/skill:<name>` — e.g. `/skill:context7-docs`, `/skill:test-driven-development`.
- **Pack map:** `/skill:pack-router research` (or delivery/quality/agents).
- **Natural language:** skill descriptions drive auto-loading, so phrase the
  task to match the lane ("how does the X API work" -> Context7;
  "debug this failure" -> debugging-and-error-recovery).

## Phases and commands

| Command | Loads | Purpose |
| --- | --- | --- |
| `/research` | `research-router` + `workflow-deep-research` | route lanes, gather evidence, schema refs |
| `/create` | `brainstorming` + `spec-driven-development` | produce a spec for the checklist |
| `/implement` | `test-driven-development` + `workflow-batch-implement` | executor phase, TDD batches |
| `/fix` | `debugging-and-error-recovery` | reproduce -> isolate -> fix -> guard |
| `/audit` | `agent-code-quality-gate` + `workflow-audit` | pattern audit, severity-ranked |
| `/review` | `verification-before-completion` + `agent-code-quality-gate` | read-only gate before completion |
| `/gc` | `workflow-gc` | garbage collection analysis |

## Research setup

1. `mkdir -p .mcporter` (gitignored).
2. Copy `mcp/omniroute.example.json` and/or `mcp/deepwiki.example.json` to
   `.mcporter/config.json` (merge servers). Context7 is optional (its server
   entry is `npx -y @upstash/context7-mcp@3.2.5`).
3. `cp .env.example .env`, fill optional keys, export them, restart pi.
4. Ask `research_guidance` for the lane + refs; the model then calls the host
   tools directly (`mcp.$search`, `mcp.$call`, or the lane refs).

### Legacy `exa` alias

The global MCP config (`~/.config/mcp/mcp.json`) currently names the OmniRoute
endpoint `exa`. The template treats that lane as `omniroute` and detects the
alias automatically. Recommend renaming the server to `omniroute` in the global
config (outside this template) when convenient; the refs keep the installed
`mcp.exa.*` names until then.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `research_guidance` says provider not configured | add it to `.mcporter/config.json`; verify the name (omniroute/context7/deepwiki) |
| degraded provider (missing env) | export the listed env var (see `.env.example`) and reload |
| extension not loaded | confirm project trust and `/reload`; check `.pi/extensions/*.ts` |
| skill not discovered | SKILL.md needs frontmatter `name` + `description`; must be under `.pi/skills/` |
| `validate:sources` fails | run `npm run sync:sources` to re-vendor/refresh hashes |
| `npm run check` fails | run each validator individually; `scan:secrets` flags accidental values |

## Customization paths

- **Guidance changes** — edit skills under `.pi/skills/packs/` or re-vendor via
  `npm run sync:sources`.
- **New curated skill** — add a manifest entry, run sync, document in
  `docs/sources.md`.
- **New pack** — create `.pi/skills/packs/<pack>/<skill>/SKILL.md`; update
  `pack-router` and `validate:packs` expectations.
- **Host-only behavior** — extend `.pi/extensions/workflow.ts`; keep it
  mutation-free and re-run `npm run check`.
