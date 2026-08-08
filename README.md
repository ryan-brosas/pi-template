# pi.dev Coding Template

A clonable Pi coding template, originally ported from
[opencode-template](https://github.com/opencode-ai/opencode-template) and now
tailored to Pi + Ultra Fabric: nine prompt commands, 62 portable skills,
11 format templates, Pi-native settings, and the prewalk guard. No build, no
dependencies, no runtime harness — clone and start.

## Installation

1. Clone or copy this repository.
2. Start pi in the project and trust it (`/trust`).
3. `/reload` to pick up prompts, skills, and config.
4. Run `/init` (or `/init --deep`) to generate AGENTS.md from the source template.

No package install is needed. There is no package.json.

## Layout

```text
AGENTS.md                    # project agent rules (this repo's own)
README.md
.gitignore
.pi/
├── fabric.json            # Ultra Fabric prewalk config (legacy verification, session arm)
├── settings.json          # Pi-native settings (thinking level, theme, compaction)
├── prompts/               # slash commands (9, incl. /init, /create, /ship)
├── skills/                # 62 skills in 8 progressive-disclosure packs (packs.json)
├── scripts/               # validate-skill-packs.mjs (structural gate)
└── templates/             # 11 format templates (PRD, design, ADR, agents, ...)
```

OpenCode runtime features (plugin/, dcp-prompts/, opencode.json, dcp.jsonc,
tui.json) and the OpenCode agent/workflow wrappers (`.pi/agents/`,
`.pi/workflows/`) are removed — Pi and Ultra Fabric provide those natively.
Generated state (`.pi/artifacts/`, `.pi/fabric/`, `.pi/hindsight/`) is
gitignored and never ships.

## Commands

| Command | Purpose |
| --- | --- |
| `/init` | initialize project context (core, or `--deep`) |
| `/create` | spec: PRD, workspace, tasks → ready for `/ship` |
| `/plan` | detailed TDD implementation plan |
| `/fix` | debug and fix a bug or failing test |
| `/ship` | implement the active spec end to end |
| `/verify` | run gates against the spec |
| `/audit` | pattern audit with remediation list |
| `/gc` | garbage collection: structural scan + cleanup plan |
| `/research` | evidence references for the prewalk schema |

Every command is a Pi prompt template under `.pi/prompts/` and runs as a
direct single-agent workflow. Commands that mutate defer to Ultra Fabric:
submit `prewalk.checklist({ items, schema })` and wait for accepted handoff
before writing. Research, audit, and verify are explicitly read-only.

## Skills and Templates

- Skills: 62 skills in 8 progressive-disclosure packs under `.pi/skills/`.
  Eight visible pack routers (pack-delivery, pack-quality, pack-research,
  pack-frontend, pack-platform, pack-data, pack-apple, pack-authoring) route by
  task; four core safety skills stay visible; all other leaves are hidden from
  automatic model invocation (`disable-model-invocation: true`) but stay
  invocable via `/skill:<name>`. Membership is owned by `.pi/skills/packs.json`;
  run `node scripts/validate-skill-packs.mjs` after adding or moving a skill.
- Templates: `.pi/templates/*.md` — PRD, design, ADR, proposal, roadmap, state,
  tasks, agents, tech-stack, project, user. `/create`, `/plan`, and `/init` render these.

## Ultra Fabric

Prewalk is the sole mutation authority: research → checklist → acceptance →
handoff → verification. `.pi/fabric.json` holds the guard configuration.

## Secrets

No secrets live in the template. Keep credentials in ignored local files or
your runtime secret store; never commit them.

## Customization

- Add a command: `.pi/prompts/<name>.md`.
- Add a skill: `.pi/skills/<name>/SKILL.md`.
- Edit templates: `.pi/templates/*.md`.
- Guard config: `.pi/fabric.json`.

