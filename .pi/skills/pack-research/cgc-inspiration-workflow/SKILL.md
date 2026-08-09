---
name: cgc-inspiration-workflow
description: "Use when finding, cloning, indexing, refreshing, comparing, or extracting capabilities from inspiration repositories through CodeGraphContext."
disable-model-invocation: true
---

# CGC Inspiration Workflow

Per-repository inspiration loop: clone once to `/home/ryanj/work/inspo/<repo>`, index with CGC, query that repository alone, then adopt, adapt, or omit each capability with evidence.

## Workflow

1. **Resolve the repository.** Confirm owner/repo and license before any clone. Never guess a URL.
2. **Reuse or clone.** If `/home/ryanj/work/inspo/<repo>/.git` exists, reuse it; do not duplicate. Otherwise clone the verified URL there. Inspiration clones stay under inspo, never in an active project's `sources/`.
3. **Capture provenance.** Record URL, absolute path, commit SHA, branch, license, and retrieval date.
4. **Index.** Run `cgc index /home/ryanj/work/inspo/<repo> --summarize`; confirm with `cgc stats /home/ryanj/work/inspo/<repo>`.
5. **Query one repository at a time.** Use `codemap({ operation, mode: "cgc", context: "/home/ryanj/work/inspo/<repo>", query })`. Treat each repository as a separate evidence source; never merge evidence before each has its own provenance.
6. **DeepWiki fallback.** Use `mcp.deepwiki.ask_question` only for a fast GitHub overview or when the CGC context is unavailable. It is not a replacement for an indexed clone.
7. **Refresh on gaps.** After a normal `git pull`, re-index incrementally. Run `cgc index ... --force --summarize` only when the graph is stale or corrupt.
8. **Compare with local AST.** Map the active project with `codemap({ operation: "explore", mode: "ast", query })` and build a matrix: capability, reference evidence, local evidence, gap, decision.
9. **Record decisions.** For each capability: `adopt`, `adapt`, or `omit`, with rationale, reference SHA, and license note.

## Context Budget

- One primary question per query; one repository per CGC query.
- Capture the matrix and decisions, not full reference dumps.
- Never re-fetch what the current context already answers.

## Stop Conditions

Stop when the reference answers the question, when two independent sources agree, or after two named gaps without progress. Mark unknowns `[NEEDS CLARIFICATION: reason]` and ask instead of indexing more repositories.

## Red Flags

Cloning into `sources/`; bulk copying without license and attribution checks; refreshing or force-reindexing without a named gap; merging evidence across repositories without provenance; treating DeepWiki as authoritative repository source.

<skill_result>
  <skill>cgc-inspiration-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Per-repository CGC queries with provenance, matrix, and adopt/adapt/omit decisions</evidence>
  <artifacts>Provenance record and capability matrix</artifacts>
  <risks>Missing license, stale graph, unindexed context, or none</risks>
</skill_result>
