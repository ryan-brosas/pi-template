# Operators guide

## Start

1. `npm install`
2. `pi` from the project root; trust the project.
3. `/reload` to discover the project extension, skills, and prompts.
4. `/workflow` for status: prewalk config, skills, prompts, extensions, MCP.

## Phases and commands

| Command | Loads | Purpose |
| --- | --- | --- |
| `/research` | `workflow-deep-research` | evidence + schema references, read-only |
| `/create` | `brainstorming` + `spec-driven-development` | produce a spec for the checklist |
| `/implement` | `test-driven-development` + `workflow-batch-implement` | executor phase, TDD batches |
| `/fix` | `debugging-and-error-recovery` | reproduce -> isolate -> fix -> guard |
| `/audit` | `agent-code-quality-gate` + `workflow-audit` | pattern audit, severity-ranked |
| `/review` | `verification-before-completion` + `agent-code-quality-gate` | read-only gate before completion |
| `/gc` | `workflow-gc` | garbage collection analysis |

Skills also load on demand (`/skill:test-driven-development`) when a task
matches their description.

## MCP setup

1. `mkdir -p .mcporter` (gitignored).
2. Copy `mcp/exa.example.json` or `mcp/deepwiki.example.json` to
   `.mcporter/config.json` (merge servers when enabling both).
3. `cp .env.example .env`, fill keys, export them, restart pi.
4. Ask `mcp_guidance` (or `/workflow`) for ready/degraded servers; the model
   then calls the host tools `mcp.$search` / `mcp.$call` (or `tools.search` /
   `tools.call` from Fabric runs) directly.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `mcp_guidance` says server not configured | add it to `.mcporter/config.json`; verify the name |
| degraded server (missing env) | export the listed env var (see `.env.example`) and reload |
| extension not loaded | confirm project trust and `/reload`; check `.pi/extensions/*.ts` |
| skill not discovered | SKILL.md needs non-empty frontmatter `name` + `description` |
| `validate:sources` fails | source drifted or vendor edited: run `npm run sync:sources` |
| `npm run check` fails | run each validator individually; `scan:secrets` flags accidental values |

## Customization paths

- **Guidance changes** — edit skills (`.pi/skills/*/SKILL.md`) or re-vendor via
  `npm run sync:sources` after editing the pi-core source.
- **New curated skill** — add an entry to `sources/manifest.json`, run
  `npm run sync:sources`, and document it in `docs/sources.md`.
- **Entry points** — edit prompts (`.pi/prompts/*.md`); keep them thin.
- **Host-only behavior** — extend `.pi/extensions/workflow.ts`; keep it
  mutation-free and re-run `npm run check`.
