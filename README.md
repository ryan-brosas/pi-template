# pi.dev Coding Template

A clonable Pi coding template, originally ported from
[opencode-template](https://github.com/opencode-ai/opencode-template) and now
tailored to Pi + Ultra Fabric: nine prompt commands, 84 portable skills,
12 format templates, Pi-native settings, and the prewalk guard. No build, no
dependencies, no runtime harness — clone and start.

## Installation

1. Clone or copy this repository.
2. Start pi in the project and trust it (`/trust`).
3. `/reload` to pick up prompts, skills, and config.
4. Run `/init` once: it performs full deep discovery and writes AGENTS.md, project.md, tech-stack.md, roadmap.md, state.md, and user.md from the source templates.

No package install is needed. There is no package.json.

## Layout

```text
AGENTS.md                    # project agent rules (this repo's own)
README.md
.gitignore
.pi/
├── fabric.json            # Ultra Fabric prewalk config (gated verification, task arm)
├── settings.json          # Pi-native settings (thinking level, theme, compaction)
├── prompts/               # slash commands (9, incl. /init, /create, /ship)
├── skills/                # 84 skills in 10 progressive-disclosure packs (packs.json)
├── templates/             # 12 format templates (PRD, design, ADR, issue, ...)
├── work/                  # tracked durable records per local work record
└── scripts/               # 5 dependency-free Node gates (skills, manifest, routing, Ultra Fabric, work)
```

OpenCode runtime features (plugin/, dcp-prompts/, opencode.json, dcp.jsonc,
tui.json) and the OpenCode agent/workflow wrappers (`.pi/agents/`,
`.pi/workflows/`) are removed — Pi and Ultra Fabric provide those natively.
Generated state (`.pi/MEMORY.md`, `.pi/implementation-notes.md`, `.pi/fabric/`, `.pi/hindsight/`) is
gitignored and never ships. Inside `.pi/work/`, the active pointer and per-work dotfiles stay ignored. Tracked work records live in `.pi/work/`, one
directory per work record.

## Commands

| Command | Purpose |
| --- | --- |
| `/init` | one-time full init: deep discovery + all context artifacts; optional GitHub repo setup |
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

- Skills: 84 skills in 10 progressive-disclosure packs under `.pi/skills/`.
  Ten visible pack routers (pack-delivery, pack-quality, pack-research,
  pack-frontend, pack-platform, pack-data, pack-apple, pack-authoring,
  pack-backend, pack-toolchains) route by
  task; four core safety skills stay visible; all other leaves are hidden from
  automatic model invocation (`disable-model-invocation: true`) but stay
  invocable via `/skill:<name>`. Membership is owned by `.pi/skills/packs.json`;
  run `node scripts/validate-skill-packs.mjs` after adding or moving a skill.
- Templates: `.pi/templates/*.md` — PRD, design, ADR, proposal, roadmap, state,
  tasks, agents, tech-stack, project, user, issue. `/init` renders agents,
  project, tech-stack, roadmap, state, and user; `/create`, `/plan`, and
  `/verify` render the rest.

## Ultra Fabric

Prewalk is the mutation authority when armed: research → checklist → acceptance →
handoff → verification. Prompts run in dual mode for flexibility: when Ultra
Fabric prewalk is armed, mutations are prewalk-gated; when it is unavailable, the
same read-only discovery runs and each mutation requires explicit per-mutation
user approval (AGENTS.md Prewalk and Mutation). `.pi/fabric.json` holds the guard
configuration (gated verification, task arm).
`node scripts/validate-ultra-fabric.mjs` pins the contract: native dispositions,
Schema requirement, and referenced skill paths.

## Work Management

`/create` is local-first: it writes a tracked record directory
`.pi/work/<slug>/` (issue.md, spec.md, research.md, design.md, plan.md,
tasks.md, verification.md) without GitHub access. An optional `--issue <number>`
links an existing verified issue and keeps the legacy `<issue>-<slug>` form.
`/create` never creates a GitHub issue. Local session state stays ignored
in `.pi/work/.active`, per-work `.progress.md`/`.verify.log` dotfiles, and
`.pi/MEMORY.md`.
`node scripts/validate-work-management.mjs` pins the ownership split, local
slug IDs, GitHub templates, and /init GitHub setup safety. `/init` optionally
creates or links the GitHub repository, pushes, and enrolls in the central
GitHub Project — each mutation needs its own approval.

## Secrets

No secrets live in the template. Keep credentials in ignored local files or
your runtime secret store; never commit them.

## Customization

- Add a command: `.pi/prompts/<name>.md`.
- Add a skill: `.pi/skills/<name>/SKILL.md`.
- Edit templates: `.pi/templates/*.md`.
- Guard config: `.pi/fabric.json`.

