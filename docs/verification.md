# Verification

Structural verification for the pi-template correction cycle: curated pi-core
skills, opencode-inspired workflows, honest MCP guidance, and source provenance.

## Changed-file scope

**Skills (replaced the four shallow phases):**

- 14 curated skills vendored from pi-core with provenance footers:
  brainstorming, spec-driven-development, test-driven-development,
  debugging-and-error-recovery, verification-before-completion,
  agent-code-quality-gate, testing-anti-patterns, api-and-interface-design,
  using-git-worktrees, capability-delegation, agent-observability,
  agent-supervision, typescript-coding-standards, writing-skills.
- 5 workflow contracts adapted from opencode-template: workflow-lifecycle,
  workflow-deep-research, workflow-audit, workflow-batch-implement, workflow-gc.
- Old shallow skills (research, implementation, testing, review) deleted.

**Extension:** `.pi/extensions/workflow.ts` rewritten — fake `mcp_invoke`
dispatch removed; now `workflow_status` + `mcp_guidance` (honest status and
host-bridge guidance) plus `/workflow`.

**Prompts:** replaced with seven thin commands: create, fix, audit, research,
implement, review, gc.

**Tooling:** `sources/manifest.json`, `scripts/sync-sources.mjs`,
`scripts/validate-workflows.mjs`, `scripts/validate-sources.mjs`; validators for
skills/prompts/mcp/structure rewritten; smoke runner updated.

**Tests:** skills-catalog, workflow-routing, prewalk-contract, mcp-guidance,
source-drift, template-smoke, extension (mcp-routing replaced).

**Docs:** README, architecture, operators, sources rewritten; verification new.

`tsconfig.json`, `.gitignore`, `.env.example`, `mcp/*.example.json` unchanged
behavior; `.pi/fabric.json` preserved verbatim. `pnpm-lock.yaml` refreshed by
install.

## Public symbols: refs + cascade evidence

Codemap refs plus a full grep sweep (the AST index under-covers `tests/` and
`.pi/` imports) enumerate every call site; none is out of scope.

| Symbol (file) | Verified call sites |
| --- | --- |
| `buildMcpGuidance` (`scripts/template-lib.ts:104`) | `validate-mcp.mjs:37`; `mcp-guidance.test.mjs:38,46`; `workflow.ts:59` |
| `createWorkflowStatusTool` (`workflow.ts:33`) | `workflow.ts:100`; `extension.test.mjs:24` |
| `createMcpGuidanceTool` (`workflow.ts:50`) | `workflow.ts:101`; `extension.test.mjs:33,42` |
| `buildWorkflowStatusText` (`workflow.ts:80`) | `workflow.ts:105`; `extension.test.mjs:47` |
| `readMcpConfig` (`workflow.ts:22`) | `workflow.ts:100,101,105` |
| `workflowExtension` default (`workflow.ts:99`) | pi host loader entry (2 tools + 1 command) |
| `parseFrontmatter` (`template-lib.ts:254`) | `validate-skills.mjs:21`, `validate-workflows.mjs:22`, `skills-catalog.test.mjs:29,34` |
| `sourcesFooter` (`template-lib.ts:246`) | `sync-sources.mjs:34`, `validate-sources.mjs:37`, `source-drift.test.mjs:32` |
| `loadManifest` (`template-lib.ts:276`) | `sync-sources.mjs:14`, `validate-sources.mjs:15`, `source-drift.test.mjs:11,23` |
| `sha256` (`template-lib.ts:238`) | `sync-sources.mjs`, `validate-sources.mjs`, `source-drift.test.mjs` |
| `listMcpCapabilities` (`template-lib.ts:78`) | `validate-mcp.mjs:30,33,35`, `mcp-guidance.test.mjs:18,25,32`, `workflow.ts:12` |
| `scanForSecrets` (`template-lib.ts:214`) | `scan-secrets.mjs`, `validate-mcp.mjs:28`, `mcp-guidance.test.mjs:58` |
| `validateChecklistContract` (`template-lib.ts:160`) | `prewalk-contract.test.mjs:37,42,48` |
| `FALLBACK_MCP_SEARCH` / `MCP_CALL_REF` | guidance in validate-mcp, mcp-guidance tests, lib |

Codemap cascade from `scripts/template-lib.ts`: `scripts/scan-secrets.mjs`,
`scripts/validate-mcp.mjs`, `tests/mcp-guidance.test.mjs`,
`tests/prewalk-contract.test.mjs` — all template files in scope.

## Repository gate (2026-08-08)

`npm run check` exits 0:

- typecheck: strict TS, exit 0
- structure: README (6 headings), docs, scripts
- config: research chain + gated mutation boundary (fabric preserved)
- skills: 19 discovered (min 12), frontmatter + provenance
- workflows: 5 contracts with role boundaries
- prompts: 7 thin commands
- mcp: both/one/none + guidance refs `mcp.$search`/`mcp.$call`
- sources: 19 entries verified, docs/sources.md present
- secrets: no committed secrets
- test: 34/34 (skills-catalog, workflow-routing, prewalk-contract, mcp-guidance,
  source-drift, template-smoke, extension)
- smoke:install: clean temp install — 8 validators pass, extension loads
  `workflow_status` + `mcp_guidance` + `/workflow`, 34 temp tests pass, clean
  worktree

`git grep -n "Dispatch ready" -- .pi/extensions tests` exits 1 and
`git grep -n "returns a dispatch plan" -- README.md docs` exits 1.
