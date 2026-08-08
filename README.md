# pi.dev Fabric Template

Fabric-first pi.dev project template: triggerable skill packs, detailed research
routing (OmniRoute, Context7, DeepWiki), thin prompt commands, and an honest
extension — all assisting Ultra Fabric's research-prewalk lifecycle, never
replacing it.

## Skills catalog

24 skills under `.pi/skills/` (packs + pack-router), provenance-tracked via
`sources/manifest.json` and checked by `npm run validate:sources`. Highlights:
planning (brainstorming, spec-driven-development, using-git-worktrees), execution
(test-driven-development, testing-anti-patterns, typescript-coding-standards,
api-and-interface-design), recovery (debugging-and-error-recovery,
verification-before-completion, agent-code-quality-gate), fabric/agents
(capability-delegation, agent-observability, agent-supervision, writing-skills),
and the research lane skills. See `docs/sources.md` for provenance and the
exclusion policy.

## Skill packs

| Pack | Skills |
| --- | --- |
| `delivery` | brainstorming, spec-driven-development, test-driven-development, testing-anti-patterns, using-git-worktrees, workflow-lifecycle, workflow-batch-implement |
| `quality` | debugging-and-error-recovery, verification-before-completion, agent-code-quality-gate, api-and-interface-design, typescript-coding-standards, workflow-audit, workflow-gc |
| `agents` | capability-delegation, agent-observability, agent-supervision, writing-skills |
| `research` | research-router, omniroute-research, context7-docs, deepwiki-repositories, workflow-deep-research |

Packs are nested directories; Pi discovers `SKILL.md` recursively, so every
skill still registers its own command and auto-loads by description.

## How to trigger skills

- `/skill:<name>` — direct, e.g. `/skill:context7-docs`, `/skill:test-driven-development`.
- `/skill:pack-router research` — pack map and routing guidance.
- Natural language — precise descriptions drive auto-loading.
- `/research`, `/create`, `/implement`, `/fix`, `/audit`, `/review`, `/gc` —
  thin prompt commands that select the right skill/workflow and defer to prewalk.

## Workflow catalog

Five workflow contracts under `.pi/skills/packs/*/workflow-*` adapted from the
opencode-template lifecycle: `workflow-lifecycle`, `workflow-deep-research`,
`workflow-audit`, `workflow-batch-implement`, `workflow-gc`. They define the
read-only roles (scout, explore, plan, review) and the single mutating role
(build, the executor after prewalk handoff).

## Ultra Fabric lifecycle

Prewalk is the sole progression authority:

1. **Research** — scout/explore; read-only evidence for the schema.
2. **Checklist** — schema-backed items (5-9) submitted to prewalk.
3. **Acceptance** — mutation is blocked until the checklist is accepted.
4. **Handoff** — the executor owns implementation and verification.
5. **Verification** — review runs refs/cascade, scope diff, and the gate.

Nothing in this template mutates before acceptance or bypasses the checklist.

## Research routing

Four lanes, decided by intent (full table in `docs/research-routing.md`):

- **Library/API docs** -> Context7 (`mcp.context7.query-docs`, resolve first).
- **Public-repository Q&A** -> DeepWiki (`mcp.deepwiki.read_wiki_contents`,
  `mcp.deepwiki.ask_question`).
- **Current web facts / URL fetch** -> OmniRoute
  (`mcp.exa.omniroute_web_search`, `mcp.exa.omniroute_web_fetch`).
- **Local code** -> codemap/CGC; never external search.

Discovery first via `mcp.$search`; named refs only as fallback. OmniRoute is
primary for general web; the standalone Exa install/example/key is removed, and
the legacy global MCP alias named `exa` is documented as an OmniRoute endpoint.

## MCP and external research

- Servers are executed by the host MCP bridge (mcporter) and surfaced as host
  tools: `mcp.$search`, `mcp.$call`, plus the lane refs (or `tools.search` /
  `tools.call` from Fabric). The extension only reports status and guidance.
- Optional config: `mcp/omniroute.example.json`, `mcp/deepwiki.example.json`;
  secrets from the environment only (`.env.example`). Context7 is optional
  (`@upstash/context7-mcp@3.2.5`).

## Installation

1. Clone or copy the template.
2. `npm install` (typecheck tooling + the extension's `typebox` dep).
3. Start pi in the project, trust it, and `/reload`.
4. `/workflow` for status; `/skill:pack-router` for the pack map.

A clean-install smoke test is available: `npm run smoke:install`.

## Verification

| Command | Purpose |
| --- | --- |
| `npm run validate:packs` | four packs, every skill assigned exactly once |
| `npm run validate:research` | four detailed research skills + refs + omniroute primary |
| `npm run validate:skills` | recursive discovery, frontmatter, provenance |
| `npm run validate:prompts` | seven thin commands paired to skills |
| `npm run validate:mcp` | lane fixtures + generic fallback + no standalone exa |
| `npm run validate:sources` | manifest sources + vendor hashes + provenance doc |
| `npm run validate:config` | Fabric prewalk config + runtime-state exclusions |
| `npm run validate:structure` | required files and README sections |
| `npm run scan:secrets` | no committed secrets |
| `npm run typecheck` | strict TS check of the extension |
| `npm test` | skill-packs, research-routing, context7, deepwiki, omniroute, prewalk-contract, source-drift, template-smoke, extension |
| `npm run smoke:install` | clean temporary install + discovery proof |
| `npm run check` | the full repository gate (all of the above) |

## Customization

- Add a skill under `.pi/skills/packs/<pack>/<skill>/SKILL.md`; add a manifest
  entry and run `npm run sync:sources` when curated.
- Prompts stay thin: they select a skill/workflow and defer to prewalk.
- The extension reports host status only; keep it mutation-free.
