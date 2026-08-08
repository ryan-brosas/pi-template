# Curated sources

## Provenance

Template assets under `.pi/skills/` are **vendored** (copied with a provenance
footer) or **synthesized** (`synth: true`, hand-authored adaptations).
`sources/manifest.json` records `source`, `sourceSha256`/`vendorSha256`, and
`license` per entry, across declared roots:

- `pi-core` — `/home/ryanj/work/projects/pi-core` (execution skills)
- `opencode-template` — `/home/ryanj/work/inspo/opencode-template` (workflows, Context7 tool)
- `pi-agent` — `/home/ryanj/.pi/agent` (research-enforcement.json routing)
- `omniroute-fork` — `/home/ryanj/work/projects/omniroute-fork` (web search/fetch schemas)
- `pi-docs` — `/home/ryanj/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs` (pack semantics)

`npm run sync:sources` re-vendors curated skills and refreshes hashes;
`npm run validate:sources` fails on drift.

## Vendored (adapted at prewalk seams only)

brainstorming, spec-driven-development, test-driven-development,
debugging-and-error-recovery, verification-before-completion,
agent-code-quality-gate, testing-anti-patterns, api-and-interface-design,
using-git-worktrees, capability-delegation, agent-observability,
agent-supervision, typescript-coding-standards, writing-skills.

## Synthesized

workflow-lifecycle, workflow-deep-research, workflow-audit,
workflow-batch-implement, workflow-gc (opencode workflows); research-router,
omniroute-research, context7-docs, deepwiki-repositories (research lanes);
pack-router (pack semantics).

## Research provider policy

- **OmniRoute is the primary general-web lane.** Standalone Exa install,
  example, and env key are removed; OmniRoute may internally use Exa as one
  failover backend.
- The **legacy global MCP alias named `exa`** is an OmniRoute endpoint; the
  template detects it and recommends renaming the server to `omniroute`
  outside the template.
- Context7 is the authoritative library-docs lane; DeepWiki is scoped to
  public-repository Q&A. No credentials are embedded anywhere.

## Exclusion policy

Project-specific domain skills in pi-core (conversion-copywriting,
core-data-expert, supabase, astro-developer, swiftui-expert-skill,
youtube-transcript, vercel-deploy-claimable, wrangler, and similar) are
deliberately excluded — this is a Fabric-focused development template, not a
domain kit. Anything with credentials, private project paths, or single-project
intent is also excluded.

## Refresh flow

1. Edit a source (pi-core, opencode-template, OmniRoute fork, pi docs).
2. `npm run sync:sources` — re-vendors and refreshes hashes.
3. `npm run validate:sources` — verifies sources and vendor files.
4. `npm run check` — full gate.
