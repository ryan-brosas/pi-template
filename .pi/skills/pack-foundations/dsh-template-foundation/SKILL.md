---
name: dsh-template-foundation
description: "Use when building a DeepSeek Harness (DSH) coding-agent template or harness: a dependency-free canonical check gate, a command-plugin that turns prompt files into slash-commands, a CDP browser-automation toolset, a profile patch layer, home config templates, and DSH workflow orchestration."
disable-model-invocation: true
---
# dsh-template: DeepSeek Harness Coding-Agent Template Foundation

## Use this for
Build a clonable DeepSeek Harness (DSH) coding-agent template or a DSH-native harness surface: a dependency-free `check.mjs` validation gate (surface, frontmatter, packs.json membership, foundation depth, profile layer, home templates, git diff, commit conventions), a `ctx.commands.register` command-plugin that turns `.dsh/prompts/<name>.md` files into slash-commands, a CDP browser-automation toolset (launch, navigate, content extraction, eval, element picker, HN scraper, cookies, screenshot), a profile patch layer (`cordis.patch.yml` + `dsh.profile.bundles`), `$DSH_HOME` config templates (`settings.yaml`/`mcp.yaml`), and DSH workflow orchestration. Source code is ground truth; references carry decisive excerpts and graph retrieval. There are no direct test files in the repo — every claim is source-grounded, and the coverage caveat is stated in each capsule.

## Load the matching source dump
- `references/canonical-check.md` — the dependency-free DSH-template validation gate (`node scripts/check.mjs`).
- `references/command-plugin.md` — turn `.dsh/prompts/*.md` files into DSH slash-commands via `ctx.commands.register`.
- `references/browser-launch.md` — idempotent Chrome launch on :9222 with optional profile sync.
- `references/browser-navigation.md` — navigate the active tab or open a new tab with reload, behind a 5s connect timeout.
- `references/browser-content-extraction.md` — extract readable page content as markdown via CDP DOM + Readability + Turndown.
- `references/browser-eval.md` — evaluate arbitrary JS in the page and format the result.
- `references/browser-picker.md` — inject `window.pick()` for interactive element selection with a highlight overlay.
- `references/browser-hn-scraper.md` — scrape Hacker News front-page submissions with cheerio.
- `references/browser-cookies.md` — dump the active tab's cookies.
- `references/browser-screenshot.md` — screenshot the active tab to a tmpdir PNG with a timestamp name.
- `references/profile-patch-layer.md` — the DSH profile patch layer (`cordis.patch.yml` + `dsh.profile.bundles`).
- `references/home-config-templates.md` — `$DSH_HOME` config templates (`settings.yaml` + `mcp.yaml`).
- `references/workflow-orchestration.md` — the DSH `workflow` tool shape and parallel fan-out pattern.
- `references/template-surface.md` — the DSH-native format-template surface mapped to DSH capabilities.

## Capsule map
- **Validation/CI** — `references/canonical-check.md`: `check.mjs` dependency-free gate (no Pi remnants, AGENTS.md, skill frontmatter + packs.json membership, foundation depth, profile layer, home templates, workflows, `git diff --check`, commit conventions).
- **Command plugin** — `references/command-plugin.md`: `project-prompts` plugin `apply`/`Config`/`resolveCommands`, `ctx.commands.register` handler that feeds the prompt body back to the agent via `invocation.agent.followup(createUserMessage(...))`.
- **Browser automation** — `references/browser-launch.md` (`browser-start.js` idempotent :9222 launch + profile rsync), `references/browser-navigation.md` (`browser-nav.js` last-tab/new-tab navigate + reload), `references/browser-content-extraction.md` (`browser-content.js` CDP DOM → Readability → Turndown markdown), `references/browser-eval.md` (`browser-eval.js` `page.evaluate` with `AsyncFunction`), `references/browser-picker.md` (`browser-pick.js` `window.pick()` interactive picker), `references/browser-hn-scraper.md` (`browser-hn-scraper.js` cheerio HN scraper), `references/browser-cookies.md` (`browser-cookies.js` cookie dump), `references/browser-screenshot.md` (`browser-screenshot.js` tmpdir PNG).
- **Profile/home wiring** — `references/profile-patch-layer.md` (`cordis.patch.yml` YAML-array loader patch entries + `package.json` `dsh.profile.bundles`), `references/home-config-templates.md` (`settings.yaml` agent presets + `mcp.yaml` MCP servers).
- **Orchestration/templates** — `references/workflow-orchestration.md` (DSH `workflow` tool `meta`/`script`/`args` shape + parallel fan-out), `references/template-surface.md` (DSH-native templates mapped to `schema_*`/`fabric_mesh`/`fovea_*` surfaces).

## Extending the foundation
Add one `references/<seam>.md` capsule for one graph-selected, source-confirmed porting question. Add one matching loader line and map entry; keep evidence in the capsule, not this leaf. Each new capsule must carry Path/Symbol, Signature, Data Shape, a labelled decisive source excerpt, Flow, Invariant, a Probe, and a `search_graph` Retrieve.

## Provenance
dsh-template (no LICENSE file in repo, `pi-fovea-foundation@ffb36822ffbcbba509deebaf3ea9412a9ea8b2c4`); Codebase Memory project `dsh-template` (fast index: 8,735 nodes / 8,793 edges, indexed 2026-08-21). Excluded by design: `.dsh/skills/pack-platform/vercel-deploy-claimable/scripts`, `.git`, `.idea`, `.pi`, `scripts`. `scripts/check.mjs` is in the excluded `scripts/` dir (read directly from source); the 8 browser-tools JS files and `.github/workflows/check.yml` report `no_recorded_issue` + `metadata_match`; the plugin `index.js` is indexed (`no_recorded_issue`) but not surfaced as graph nodes. No direct test files exist for the code — all claims are source-grounded.

## Full view (memory graph)
Revalidate `dsh-template` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source decides shipped claims. The `scripts/` dir (containing `check.mjs`) is excluded by design, so read that file directly; the plugin file is indexed but its symbols are not surfaced as graph nodes, so read it directly too.

## Boundaries
Adopt the dependency-free canonical check gate, the `ctx.commands.register` command-plugin contract, the CDP browser-automation scripts, the profile patch layer, the `$DSH_HOME` config templates, and the workflow/template surfaces. Adapt the browser binary path, profile source dir, MCP server list, model/provider config, and prompt command set to the host. Omit the DSH agent-preset internals, the `fabric_mesh`/`schema_*`/`fovea_*` runtime behaviors (they live in the DSH harness, not this template), and the `vercel-deploy-claimable`/`find-polluter` scripts unless a target needs them.
