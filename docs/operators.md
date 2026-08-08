# Operators guide

## Start

1. `npm install`
2. `pi` from the project root; trust the project.
3. `/reload` to discover the project extension, skills, and prompts.
4. `/workflow` to see lifecycle and provider status.

## Phases

- `/research` (or `/skill:research`) — run the research phase; produces the
  schema references and local scope for the prewalk checklist.
- `/implement`, `/test`, `/review` — thin prompt entry points that load the
  matching skill and defer progression to prewalk.

## MCP setup

1. `mkdir -p .mcporter` (gitignored).
2. Copy `mcp/exa.example.json` or `mcp/deepwiki.example.json` to
   `.mcporter/config.json` (merge servers when enabling both).
3. `cp .env.example .env`, fill keys, export them (`set -a; source .env; set +a`
   or your shell's equivalent).
4. Restart pi; `mcp_capabilities` reports ready/degraded providers.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `mcp_invoke` returns provider-unavailable | add the server to `.mcporter/config.json`; verify the name |
| missing-secret error | export the listed env var (see `.env.example`) and reload |
| extension not loaded | confirm project trust and `/reload`; check `.pi/extensions/*.ts` |
| skill not discovered | SKILL.md needs non-empty frontmatter `name` + `description` |
| `npm run check` fails | run each validator individually; `scan:secrets` flags accidental values |

## Customization paths

- **Guidance changes** — edit skills (`.pi/skills/*/SKILL.md`).
- **Entry points** — edit prompts (`.pi/prompts/*.md`).
- **New MCP provider** — add an example under `mcp/`, an env key in
  `.env.example`, and a fixture in `tests/mcp-routing.test.mjs`.
- **Host-only behavior** — extend `.pi/extensions/workflow.ts`; keep it
  minimal and mutation-free, and re-run `npm run check`.
