# Inspo ingestion + adoption ledger — 2026-08-16

Twenty well-tested GitHub repositories were shallow-cloned into
`/mnt/hdd/utopia/inspo/` and indexed into the Codebase Memory graph
(61 projects, 871,107 nodes after ingestion). Selection restriction: repos must
be actively tested with green CI so adopting their patterns is low-risk.

## Ingestion

| repo | license | head | verdict |
|---|---|---|---|
| sst/opencode | MIT | dev@4643e65 | adopt — branch/commit conventions |
| anthropics/skills | none (all rights reserved) | main@f6656c1 | omit — no license to copy; trigger-description pattern already in packs.json |
| goldbergyoni/nodebestpractices | CC-BY-SA-4.0 | master@dc3d60c | omit — copyleft; survey only |
| Aider-AI/aider | Apache-2.0 | main@5dc9490 | omit — repo-map role covered by Codebase Memory |
| mem0ai/mem0 | Apache-2.0 | main@001c235 | omit — memory role covered by Codebase Memory MCP |
| microsoft/graphrag | MIT | main@60668ba | omit — graph-query role covered by Codebase Memory |
| vitest-dev/vitest | MIT | main@cf9176b | omit — no runtime in template |
| eslint/eslint | MIT | main@dc1e7a8 | omit — custom validators are the product |
| modelcontextprotocol/modelcontextprotocol | NOASSERTION | main@4df2d6b | omit — inspect only |
| modelcontextprotocol/servers | NOASSERTION | main@76d64c8 | omit — inspect only |
| openai/openai-agents-python | MIT | main@cb8a2e7 | omit — survey only |
| biomejs/biome | Apache-2.0 | main@6cd32636 | omit — no runtime |
| dubinc/dub | NOASSERTION | main@873edc5 | omit |
| vercel/ai | NOASSERTION | main@d25cae2 | omit |
| continuedev/continue | Apache-2.0 | main@5522c6f | omit — IDE workflow already in jetbrains-ide-workflow skill |
| refined-github/refined-github | MIT | main@3bbe608 | omit |
| web-infra-dev/rsbuild | MIT | main@ded9263 | omit |
| nestjs/nest | MIT | master@61b0351 | omit |
| RooCodeInc/Roo-Code | Apache-2.0 | main@b867ec9 | omit — survey only |
| JetBrains/qodana-action | Apache-2.0 | main@829c6a5 | adopt — qodana.yml workflow already committed |

## Adopted

1. **Branch/commit conventions** (from sst/opencode AGENTS.md, MIT): branch
   names at most three hyphen-separated lowercase words, no type prefixes;
   conventional commit subjects. Landed as the Conventions section in
   AGENTS.md and `.pi/templates/agents.md`, enforced by the commit-convention
   gate added to `scripts/check.mjs` (checks unpushed commits and PR branch
   names only; history is never re-judged).
2. **Assume-nothing rule** (user requirement): never assume an MCP server,
   websearch hit, or code-memory graph entry is available or current — verify
   live state before relying on it. Landed in AGENTS.md Safety boundaries and
   the agents.md template.
3. **Qodana CI lane** (from JetBrains/qodana-action, Apache-2.0): already
   present in `.github/workflows/qodana.yml`; provenance recorded here.
