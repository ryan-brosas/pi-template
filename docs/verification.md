# Verification

Final structural verification for the pi.dev Fabric template implementation.

## Changed-file manifest

Matches the accepted checklist `localScope` plus documented supporting files:

**In scope (checklist):**

- `.gitignore`, `package.json`, `README.md`, `.env.example`
- `.pi/fabric.json` — **preserved unchanged** (configVersion 3, prewalk gated)
- `.pi/skills/{research,implementation,testing,review}/SKILL.md`
- `.pi/prompts/{research,implement,test,review}.md`
- `.pi/extensions/workflow.ts`
- `mcp/{exa,deepwiki}.example.json`
- `scripts/*` (template-lib.ts, 6 validators, smoke-install.mjs)
- `tests/*` (prewalk-contract, mcp-routing, template-smoke, extension)
- `docs/{architecture,operators,verification}.md`

**Documented additions (required by the gate):**

- `tsconfig.json` — strict TS config for `npm run typecheck` (checklist item 4)
- `pnpm-lock.yaml`, `pnpm-workspace.yaml` — generated dependency lock + build approvals for the `@earendil-works/pi-coding-agent` transitive deps

**Explicitly not tracked:** `.pi/fabric/`, `.pi/hindsight/` (gitignored runtime state).

## Public symbols: refs + cascade evidence

Codemap refs (AST) plus a full grep sweep (the index does not cover `tests/` imports of the extension) enumerate every call site. No out-of-scope caller exists.

| Symbol (file) | Verified call sites |
| --- | --- |
| `createMcpInvokeTool` (`.pi/extensions/workflow.ts:36`) | `workflow.ts:116` registration; `tests/extension.test.mjs:27,38,45` |
| `createMcpCapabilitiesTool` (`.pi/extensions/workflow.ts:75`) | `workflow.ts:117`; `tests/extension.test.mjs:53` |
| `buildWorkflowStatus` (`.pi/extensions/workflow.ts:97`) | `workflow.ts:121` (/workflow command); `tests/extension.test.mjs:60` |
| `readMcpConfig` (`.pi/extensions/workflow.ts:21`) | `workflow.ts:103,116,117` |
| `workflowExtension` default (`.pi/extensions/workflow.ts:112`) | pi host loader entry (registered tools/command); no stray callers |
| `listMcpCapabilities` (`scripts/template-lib.ts:78`) | codemap refs: `validate-mcp.mjs:30,33,35`; grep: `mcp-routing.test.mjs:18,25,32`, `workflow.ts:82,103` |
| `resolveDispatch` (`scripts/template-lib.ts:101`) | `mcp-routing.test.mjs:41,55,68,80`; `workflow.ts:47` |
| `providerStatus` (`scripts/template-lib.ts:56`) | `mcp-routing.test.mjs:21,28`; `validate-mcp.mjs:32`; internal `template-lib.ts:81` |
| `parseMcpConfig` (`scripts/template-lib.ts:20`) | `mcp-routing.test.mjs:88`; `validate-mcp.mjs:24`; `workflow.ts:32` |
| `readJsonFile` (`scripts/template-lib.ts:31`) | `workflow.ts:28,89` |
| `requiredEnvNames` (`scripts/template-lib.ts:39`) | internal `template-lib.ts:60,124` |
| `validateChecklistContract` (`scripts/template-lib.ts:160`) | `prewalk-contract.test.mjs:37,42,48` |
| `scanForSecrets` (`scripts/template-lib.ts:214`) | `scan-secrets.mjs:5`; `validate-mcp.mjs:28`; `mcp-routing.test.mjs:91` |
| `EXAMPLE_PROVIDERS`, `FALLBACK_MCP_SEARCH` (`scripts/template-lib.ts:7-8`) | `validate-mcp.mjs`, `mcp-routing.test.mjs`, internal use |

Codemap cascade from `scripts/template-lib.ts` (dependency neighborhood): `scripts/scan-secrets.mjs`, `scripts/validate-mcp.mjs`, `tests/mcp-routing.test.mjs`, `tests/prewalk-contract.test.mjs` — all template files in scope.

## Repository gate

`npm run check` exits 0 (run 2026-08-08):

- `typecheck` — strict TS, exit 0
- `validate:structure` — package, 5 README headings, 4 skills, 4 prompts, docs
- `validate:config` — research chain `omniroute/opencode-go/deepseek-v4-flash-max`, gated mutation boundary
- `validate:skills` — 4 lifecycle-aware skills
- `validate:prompts` — 4 thin entry points
- `validate:mcp` — both/one/none fixtures + `mcp.$search` fallback
- `scan:secrets` — no committed secrets
- `test` — 27/27 tests pass (prewalk-contract, mcp-routing, template-smoke, extension)
- `smoke:install` — clean temp install: all validators pass, extension registers `mcp_invoke` + `mcp_capabilities` + `/workflow`, 27 temp tests pass, clean worktree

No out-of-scope behavior changed; `.pi/fabric.json` was preserved verbatim.
