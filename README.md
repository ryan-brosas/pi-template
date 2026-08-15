# pi.dev Coding Template

A clonable Pi coding template, originally ported from
[opencode-template](https://github.com/opencode-ai/opencode-template) and now
 tailored to Pi + Pi Fabric: 9 prompt commands, 101 skill files
 (91 leaves in 10 packs), 12 format templates, Pi-native settings, and the
Schema mutation guard. No build, no dependencies, no runtime harness — clone and start.

## Installation

1. Clone or copy this repository.
2. Start pi in the project and trust it (`/trust`).
3. `/reload` to pick up prompts, skills, and config.
4. Run `/init` once: it performs full deep discovery and writes `AGENTS.md`, `.pi/project.md`, `.pi/tech-stack.md`, `.pi/roadmap.md`, `.pi/state.md`, and `.pi/user.md` from the source templates.

No package install is needed. There is no package.json.

**Requirements:** Pi 0.80.6+ with Pi Fabric 0.48.0+ installed in the host. The prompts, Schema guard, and skill packs ship in this repository; Node.js 24+ (required by the current Pi Fabric host) is also used by the optional validation gate
(`scripts/check.mjs`) and GitHub Actions. The repository itself remains dependency-free; Veda is optional and host-local.

## Layout

```text
AGENTS.md                    # project agent rules (this repo's own)
README.md
.gitignore
.pi/
├── fabric.json            # Pi Fabric Schema guard (enforce or audit + canonical-check)
├── settings.json          # Pi-native settings (thinking level, theme, compaction)
├── prompts/               # slash commands (9, incl. /init, /create, /ship)
├── skills/                # 101 skill files: 10 pack routers + 91 leaves (packs.json)
├── templates/             # 12 format templates (PRD, design, ADR, issue, ...)
├── work/                  # tracked durable records per local work record
└── scripts/               # canonical check plus 7 dependency-free Node validators
```

OpenCode runtime features (plugin/, dcp-prompts/, opencode.json, dcp.jsonc,
tui.json) and the OpenCode agent/workflow wrappers (`.pi/agents/`,
`.pi/workflows/`) are removed — Pi and Pi Fabric provide those natively.
Generated state (`.idea/`, `.pi/MEMORY.md`, `.pi/implementation-notes.md`, `.pi/fabric/`) is
gitignored and never ships. Inside `.pi/work/`, the active pointer, per-work dotfiles, and `ide-inspections/` stay ignored. Tracked work records live in `.pi/work/`, one
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
| `/research` | evidence references for the Schema evidence loop |

Every command is a Pi prompt template under `.pi/prompts/` and runs as a
direct single-agent workflow. Commands that mutate defer to Fabric's
Schema guard: run `schema.hypothesize → verify → commit` in one `fabric_exec`
before writing. Research, audit, and verify are explicitly read-only.

## Validation

Run the complete local gate with `node scripts/check.mjs`. It runs all seven
dependency-free validators and `git diff --check`. GitHub runs the same command
from `.github/workflows/check.yml` on pushes to `main` and pull requests. Qodana (JetBrains static analysis, configured per project in `qodana.yaml`) runs from `.github/workflows/qodana.yml` and uploads SARIF to code scanning.

To enable it, add a `QODANA_TOKEN` secret (register at qodana.cloud; free for
open source). Without the secret the workflow skips and CI stays green.

## Skills and Templates


- Skills: 101 skill files — 10 pack routers, 4 core safety skills, and 87 hidden leaves across 10 progressive-disclosure packs under `.pi/skills/`.
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

## Pi Fabric

Schema commit is the mutation authority: research → hypothesize → verify →
commit → postcondition check. Prompts run in dual mode for flexibility: when
the guard is in enforce mode (`schema.status()` reports `enforce`), mutations
require the commit loop with automatic rollback; otherwise (`audit` mode, guard
off, or project untrusted), each mutation requires explicit per-mutation user
approval (AGENTS.md Mutation Authority).
`.pi/fabric.json` holds the guard configuration (`schema.mode`: `enforce` or
`audit`, plus the `canonical-check` trusted command).
`node scripts/validate-pi-fabric.mjs` pins the contract: full-code mode, the QuickJS memory ceiling, Schema mode (enforce or audit), prompt dispositions, host-selectable agent runner, ignored `.veda/` state, and referenced skill paths.

### Optional Veda lane

Use a budget funnel rather than spending a frontier model on every read. Veda Gemini profiles do cheap discovery and context reduction; direct AGY Claude supplies the load-bearing architecture judgment. Model output is advisory, while Pi Fabric, source evidence, tests, and Schema postconditions remain authoritative.

| Work | Economical lane | Claude escalation | Profile / contract |
| --- | --- | --- | --- |
| Repository map | Veda → AGY `gemini-3.6-flash-low` | none | `repo-scout` |
| Context curation | Veda → AGY `gemini-3.6-flash-medium` | none | `context-curator` |
| Frontend audit | Veda → AGY Flash high | direct AGY Sonnet for a focused critique | `frontend-auditor` |
| Cross-system synthesis | Veda → AGY `gemini-3.1-pro-low` | direct AGY Opus if architecture is load-bearing | `cross-system-synthesizer` |
| Architecture plan / high-risk review | none | direct AGY `claude-opus-4-6-thinking` | `agy --mode plan`, no `--effort` |

The funnel adds planning power by making Opus consume a curated decision packet instead of raw repository noise. Use Opus once for the architecture plan and again only for high-risk final review; use direct AGY Sonnet for cheaper intermediate critique. AGY's current live catalog includes these Claude and Gemini IDs, but it exposes no reliable quota counter, so escalate by risk and cap repeated calls.

```bash
# Cheap Veda passes (aliases are host-local; select bounded files first).
veda -S <session> sel clear
veda -S <session> sel add .pi/work/<slug>/spec.md src/ components/ styles/ tests/
veda -S <session> -m gemini-lite -p repo-scout 'Map the selected files; cite paths, symbols, dependencies, and gaps.'
veda -S <session> -m gemini-mid -p context-curator 'Compress selected findings into a bounded handoff packet.'
veda -S <session> -m gemini-ui -p frontend-auditor 'Audit selected UI structure, states, accessibility, and visual risks.'
veda -S <session> -m gemini-pro-low -p cross-system-synthesizer 'Merge selected findings into a compact decision packet for architecture planning.'

# Load-bearing planning: direct AGY Claude, not Veda (omit --effort).
agy --add-dir "$PWD" --model claude-opus-4-6-thinking --mode plan --print 'Read the selected repository context. Do not edit. Produce the architecture decision, rejected alternatives, non-goals, ordered stations, acceptance checks, risks, and implementation handoff.'

# Cheaper critique or follow-up.
agy --add-dir "$PWD" --model claude-sonnet-4-6 --mode plan --print 'Read the selected context and current diff. Do not edit. Report concrete architectural risks and missing acceptance checks.'
```

Direct AGY Opus and Sonnet succeeded without `--effort`. Do not route them through `veda -b agy`: Veda's current AGY adapter injects `--effort`, which these Claude models reject. The Veda-to-AGY Claude route is currently unsupported until that adapter conditionally omits the flag. Use `-o /tmp/veda-report.md` for disposable Veda output; durable `.pi/work/` reports require the Schema loop.

## Work Management

`/create` is local-first: it writes a tracked record directory
`.pi/work/<slug>/` (issue.md, spec.md, research.md, proposal.md, design.md,
adr.md, plan.md, tasks.md, verification.md) without GitHub access. An optional `--issue <number>`
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

## Optional host-side tools

Codebase Memory MCP, JetBrains IDE/ACP integration, `todo`, and editor-review
tools are installed host-side; they are not part of the template surface and a
fresh clone does not depend on them.

- [Codebase Memory MCP](https://github.com/DeusData/codebase-memory-mcp) — the
  preferred graph-first surface for repository architecture, symbol discovery,
  caller/callee and data-flow tracing, blast radius, and indexed inspiration
  repositories. Agents list indexed projects before use, check index coverage,
  and confirm exact source before edits or exhaustive claims.
- JetBrains IDE/ACP tools — the preferred development surface when connected:
  project-aware file/symbol search, dependency source reads, call hierarchy,
  IDE-applied patches, semantic rename, formatting, inspections, builds,
  run/debug configurations, and opening exact review locations.

- `todo` — a branch-aware, session-persisted todo list. The agent can add,
  start, note, block, and reorder items but never marks them complete;
  completion is user-controlled. Use it as a live, user-confirmed mirror of a
  work record's stations; `.pi/work/<slug>/.progress.md` stays the durable
  ledger.
- `open_in_zed` — legacy fallback that opens a file at a line/column in Zed for
  review when JetBrains editor tools are unavailable.
- `zed_list` — lists a directory's entries (ls-style) so Pi can see what is in
  the repo or a folder before opening files in Zed.
- `zed_open_project` — opens a directory as a project in Zed so the user can
  browse and edit a whole folder.

Install the optional `todo`/Zed extension host-side (never with `-l`, which
would write `.pi/settings.json` and make the clone depend on it):

```bash
pi install git:github.com/j-joker/pi-workflow
```

## Customization

- Add a command: `.pi/prompts/<name>.md`.
- Add a skill: `.pi/skills/<name>/SKILL.md`.
- Edit templates: `.pi/templates/*.md`.
- Guard config: `.pi/fabric.json`.
