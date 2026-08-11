---
name: cgc-inspiration-workflow
description: "Use when finding, cloning, indexing, refreshing, comparing, or extracting capabilities from inspiration repositories through CodeGraphContext."
disable-model-invocation: true
---

# CGC Inspiration Workflow

Per-domain inspiration loop: discover the covering repo through the inspo meta-context, reuse the clone, index with CGC, query that repository alone, then adopt, adapt, or omit each capability with evidence.

## Workflow

0. **Discover the covering repo.** Query the inspo meta-context by domain before touching any repo: `codemap({ operation: "explore", mode: "cgc", context: "/home/ryanj/work/inspo", query: "<domain>" })`. Read the repo name from the path prefix of returned symbols; fall back to `cgc list` or the inspiration registry (`ryan-workspace/registry/inspiration.json`) when the meta-context returns nothing. Never guess a repo name from the task alone.
1. **Resolve the repository.** Confirm owner/repo and license before any clone. Never guess a URL.
2. **Reuse or clone.** If `/home/ryanj/work/inspo/<repo>/.git` exists, reuse it; do not duplicate. Otherwise clone the verified URL there. Inspiration clones stay under inspo, never in an active project's `sources/`.
3. **Capture provenance.** Record URL, absolute path, commit SHA, branch, license, and retrieval date.
4. **Index.** Run `cgc index /home/ryanj/work/inspo/<repo> --summarize`; confirm with `cgc stats /home/ryanj/work/inspo/<repo>`. The indexed graph is the only query surface for an inspiration clone: never text-search the inspo tree with rg/grep/pi.grep. If a repo context is missing or stale, `cgc index` it before querying; raw grep returns file bytes into context and defeats the compression.
5. **Query one repository at a time.** Use `codemap({ operation, mode: "cgc", context: "/home/ryanj/work/inspo/<repo>", query })`. Treat each repository as a separate evidence source; never merge evidence before each has its own provenance.
6. **DeepWiki fallback.** Use `mcp.deepwiki.ask_question` only for a fast GitHub overview or when the CGC context is unavailable. It is not a replacement for an indexed clone.
7. **Refresh on gaps.** After a normal `git pull`, re-index incrementally. Run `cgc index ... --force --summarize` only when the graph is stale or corrupt.
8. **Compare with local AST.** Map the active project with `codemap({ operation: "explore", mode: "ast", query })` and build a matrix: capability, reference evidence, local evidence, gap, decision.
9. **Record decisions.** For each capability: `adopt`, `adapt`, or `omit`, with rationale, reference SHA, and license note.

## Context Budget

- One primary question per query; one repository per CGC query.
- Discovery is one meta-context query, never per-repo probes or greps.
- Extract patterns through explore and source (AST ranges); never `pi.read` whole files from inspo.
- Index or update only after a git pull; never re-index gratuitously.
- Topical relevance is not evidentiary validity: a clone is a navigation snapshot, not a truth store. Verify adopted claims against the repo's code, tests, and docs, and cross-check with an independent source.
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
