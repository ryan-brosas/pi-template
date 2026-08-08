# Verification

Structural verification for the pi-template skill-pack and research-routing cycle.

## Changed-file scope

- **Init:** `.pi/prompts/init.md` added as an operational prompt with exactly
  `/init` and `/init --deep`; AGENTS.md + `.pi/project/{tech-stack,architecture,
  conventions,commands,research-baseline}.md` artifact contract; prewalk-safe
  preview/handoff/verify flow. The AGENTS.md baseline now covers user override,
  file/destructive-command safety, communication/writing, accuracy/debugging,
  semantic navigation, secrets, Git/shell, memory, agent escalation, sources/
  discovery, and the landing-the-plane completion checklist.
- **OmniRoute:** skill expanded to the authoritative search/fetch schemas (9
  search providers, 4 fetch providers, formats, depth/selector, output evidence,
  usage telemetry); validators and tests pin the contract.
- **Guard:** `.pi/fabric.json` may be `gated/session` or `off/off`;
  `validate:config` accepts both and reports the effective mutation boundary.
- **Packs:** skills moved to `.pi/skills/packs/{delivery,quality,agents,research}/`;
  `pack-router` added at `.pi/skills/pack-router/SKILL.md`. 24 skills discovered.
- **Research:** four detailed skills added to the research pack (research-router,
  omniroute-research, context7-docs, deepwiki-repositories); `workflow-deep-research`
  moved into the pack.
- **Providers:** the standalone Exa example and env key were removed; the
  OmniRoute example was added; Context7 and DeepWiki lanes documented.
- **Extension:** rewritten provider-neutral — `workflow_status` + `research_guidance`
  + `/workflow`; reads project and global MCP config; reports lanes incl. legacy
  alias; never fabricates execution.
- **Validators:** `validate:packs`, `validate:research` added; skills/prompts/mcp/
  structure validators updated; smoke runner extended.
- **Tests:** skill-packs, research-routing, context7, deepwiki, omniroute added;
  prewalk-contract, source-drift, template-smoke, extension updated.
- **Docs:** README (9 sections incl. Skill packs, How to trigger skills, Research
  routing), docs/research-routing.md, architecture/operators/sources updated.
- `tsconfig.json`, `.gitignore` unchanged; `.pi/fabric.json` preserved verbatim.

## Public symbols: refs + cascade evidence

| Symbol (file) | Call sites |
| --- | --- |
| `researchIntent` (`scripts/template-lib.ts`) | `buildResearchGuidance`; research-routing/context7/deepwiki/omniroute tests |
| `buildResearchGuidance` (`scripts/template-lib.ts`) | `validate-mcp.mjs`, `research_guidance` tool, routing/context7/deepwiki/omniroute tests |
| `providerStatus` / `listMcpCapabilities` (`scripts/template-lib.ts`) | extension status tool, validate-mcp, tests |
| `createWorkflowStatusTool` / `createResearchGuidanceTool` (`workflow.ts`) | default registration; extension tests |
| `buildWorkflowStatusText` (`workflow.ts`) | `/workflow` command; extension tests |
| `readResearchConfig` (`workflow.ts`) | default registration; extension tests |
| `validate-packs` / `validate-research` scripts | package.json check chain; smoke install |

Codemap cascade from `scripts/template-lib.ts` reaches validators, extension,
and research tests; all in scope.

## Concrete refs/cascade sweep

- `researchIntent` -> `buildResearchGuidance` (internal, `template-lib.ts:200-201`);
  context7/deepwiki/research-routing/omniroute tests.
- `buildResearchGuidance` -> `validate-mcp.mjs:37`, `workflow.ts:59`
  (`research_guidance` tool), context7/deepwiki/research-routing/omniroute tests.
- `providerStatus` -> `template-lib.ts:131,198`, `validate-mcp.mjs:37`,
  `workflow.ts:103` (status tool).
- `listMcpCapabilities` -> `validate-mcp.mjs:35,38,40`, `workflow.ts:102`,
  omniroute tests.
- `createWorkflowStatusTool` / `createResearchGuidanceTool` -> default
  registration (`workflow.ts:123-124`) and extension tests.
- `buildWorkflowStatusText` -> `/workflow` command (`workflow.ts:128`),
  extension tests.
- `readResearchConfig` -> `workflow.ts:123,124,128`.
- `workflowExtension` default -> pi host loader entry (2 tools + 1 command);
  no stray callers.

## Provider findings (direct evidence)

- OmniRoute (omniroute-fork) is a local MCP endpoint whose gateway includes Exa
  among many failover providers; standalone Exa example/key removed from the
  template.
- Global MCP alias `exa` is an OmniRoute transport; template treats the lane as
  `omniroute` and detects the alias (documented in docs and skills).
- Context7 (`@upstash/context7-mcp@3.2.5`) resolve-then-query restored as the
  library-docs lane; DeepWiki scoped to public-repository Q&A.
- Installed research-enforcement.json categories map 1:1 to the template lanes.

## Repository gate

`npm run check` exits 0: typecheck, structure (9 headings), config, packs (4
packs, 24 skills), research (4 skills, 7 sections, 9 search providers, 4 fetch
providers, full schema fields, omniroute primary), skills (24), prompts (8
commands incl. operational init), mcp (lanes + fallback + no standalone exa),
sources (24 entries), secrets (clean), tests (incl. init + omniroute detail
suites), smoke:install (clean temp install with 9 validators, extension load,
tests pass, clean worktree).

`git grep` for the retired standalone Exa identifiers (env key, package, example path) exits 1.
