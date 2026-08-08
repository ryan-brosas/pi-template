# Architecture

## Why curated skills, workflows, and prewalk

Ultra Fabric's prewalk already owns research, checklist acceptance, handoff,
and verification gates. This template never forks that orchestration. It adds
three layers around it:

1. **Curated skills** (`.pi/skills/`, vendored from pi-core with provenance)
   — proven execution guidance for planning, TDD, debugging, verification,
   quality gating, API design, worktrees, delegation, observability,
   supervision, TypeScript standards, and skill authoring.
2. **Workflow contracts** (`.pi/skills/workflow-*/`, adapted from the
   opencode-template lifecycle) — read-only roles (`scout`, `explore`, `plan`,
   `review`) and the single mutating role (`build`, the executor after prewalk
   handoff).
3. **Thin prompts** (`.pi/prompts/`) — one command per phase (`create`, `fix`,
   `audit`, `research`, `implement`, `review`, `gc`) that selects the right
   skill/workflow and defers progression to prewalk.

## Ultra Fabric lifecycle contract

```
research -> schema-backed checklist -> acceptance -> handoff -> executor -> verification
```

- Mutation is blocked before acceptance (`.pi/fabric.json` prewalk
  `verificationMode: gated`, `arm: session`).
- Read-only roles (scout/explore/plan/review) never mutate; only the executor
  (build) mutates, strictly after handoff and inside `localScope.files`.
- Review runs codemap refs/cascade on changed public symbols and confirms the
  changed-file scope before completion.

## Extension design (honest status only)

`.pi/extensions/workflow.ts` registers:

- `workflow_status` — prewalk config, discovered skills/prompts/extensions, and
  configured MCP servers with ready/degraded status. Read-only.
- `mcp_guidance` — returns guidance for calling MCP servers through the host
  MCP bridge: which host tools to use (`mcp.$search`, `mcp.$call`, or
  `tools.search` / `tools.call` from Fabric), whether a server is configured and
  ready, and which env secrets are missing. It never fabricates or executes a
  dispatch.
- `/workflow` — status notification command.

The extension has no runtime imports beyond `typebox` and relative template
helpers, and performs no file writes.

## MCP and external research

- MCP servers are configured in `.mcporter/config.json` (gitignored) and
  executed by the host bridge; credentials come from the environment only.
- `mcp/*.example.json` provides optional Exa/DeepWiki fragments; `mcp.$search`
  remains the generic fallback.
- External research during the research phase uses scout/explore roles and the
  host MCP tools; no template component shells out to providers itself.

## Shared logic and source provenance

`scripts/template-lib.ts` is the single source of truth for MCP guidance,
prewalk-contract validation (mirroring Ultra Fabric's rules), frontmatter
parsing, secret scanning, and hash/provenance helpers.

`sources/manifest.json` + `scripts/sync-sources.mjs` track every curated asset:
source path, source/vendor sha256, and synth status. `validate:sources` fails on
drift; `docs/sources.md` records provenance and the exclusion policy.

## Secrets

- Example configs reference env vars only (`${EXA_API_KEY}`,
  `${DEEPWIKI_API_KEY}`); the environment is the only value source.
- `.env.example` ships with empty values; `scan:secrets` fails the gate on any
  assignment carrying a value.
