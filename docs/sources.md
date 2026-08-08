# Curated sources

## Provenance

All template assets under `.pi/skills/` are either **vendored** (copied from a
source with a provenance footer) or **synthesized** (`synth: true`, hand-authored
adaptations of a source). `sources/manifest.json` records for every entry:

- `source` — absolute path in `/home/ryanj/work/projects/pi-core` (curated
  execution skills) or `/home/ryanj/work/inspo/opencode-template` (workflow
  contracts).
- `sourceSha256` / `vendorSha256` — content hashes; `npm run validate:sources`
  fails when either drifts, and `npm run sync:sources` re-vendors and refreshes
  them.
- `license` — pi-core and opencode-template are private/author works with no
  license headers; reuse here is for the template's own purpose with attribution
  to the source path. `writing-skills` content is governed by the license noted
  in its source repository.

## Vendored (adapted at prewalk seams only)

brainstorming, spec-driven-development, test-driven-development,
debugging-and-error-recovery, verification-before-completion,
agent-code-quality-gate, testing-anti-patterns, api-and-interface-design,
using-git-worktrees, capability-delegation, agent-observability,
agent-supervision, typescript-coding-standards, writing-skills.

## Synthesized (workflow contracts)

workflow-lifecycle, workflow-deep-research, workflow-audit,
workflow-batch-implement, workflow-gc — adapted from the opencode-template
workflows and role agents (scout/explore/plan/build/review), re-stated around
Ultra Fabric prewalk authority.

## Exclusion policy

Project-specific domain skills in pi-core are deliberately **excluded**:
conversion-copywriting, copy-on-write-variations, core-data-expert,
course-content-publishing, supabase, astro-developer, swiftui-expert-skill,
youtube-transcript, vercel-deploy-claimable, wrangler, and similar. The template
is a Fabric-focused development template, not a domain kit. Anything with
credentials, private project paths, or single-project intent is also excluded.

## Refresh flow

1. Edit a source in pi-core or opencode-template.
2. `npm run sync:sources` — re-vendors curated skills and refreshes hashes.
3. `npm run validate:sources` — verifies sources exist and vendor files match.
4. `npm run check` — full gate.
