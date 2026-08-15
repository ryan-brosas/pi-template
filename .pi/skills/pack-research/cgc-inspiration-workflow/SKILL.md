---
name: cgc-inspiration-workflow
description: "Use when a legacy request mentions CGC and must be migrated to the installed Codebase Memory MCP workflow without invoking obsolete cgc commands."
disable-model-invocation: true
---

# Legacy CGC Migration

CGC is no longer the preferred or installed repository graph. Do not invoke
`cgc` commands. Load and follow `../codebase-memory/SKILL.md` instead.

Translate old CGC intent as follows:

- context/repository listing → `codebase-memory_list_projects`
- index/update → `codebase-memory_index_repository` only when absent or stale
- architecture/orientation → `codebase-memory_get_architecture`
- name/content lookup → `codebase-memory_search_graph` or
  `codebase-memory_search_code`
- analyze callers/dependencies → `codebase-memory_trace_path`
- completeness check → `codebase-memory_check_index_coverage`

Preserve the original adopt/adapt/omit evidence standard: record repository,
branch or SHA, license, exact query, coverage caveats, source confirmation, and
decision rationale.

## Stop Conditions

Stop when the reference answers the question, two independent sources agree, or
two named gaps produce no progress. Mark unknowns rather than indexing more
repositories.

<skill_result>
  <skill>cgc-inspiration-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Legacy request migrated to bounded Codebase Memory queries</evidence>
  <artifacts>Provenance record and capability matrix</artifacts>
  <risks>Missing license, stale or partial graph, obsolete CGC assumption, or none</risks>
</skill_result>
