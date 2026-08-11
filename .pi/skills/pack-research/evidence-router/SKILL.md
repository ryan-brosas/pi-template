---
name: evidence-router
description: "Use when choosing retrieval tools for research: CGC for inspiration repositories, DeepWiki for GitHub overviews, Context7 for library docs, OmniRoute search for discovery, and OmniRoute fetch for selected pages."
disable-model-invocation: true
---

# Evidence Router

Pick one primary route per question, escalate only on a named gap, and stop once evidence is sufficient. This keeps research cheap and context small.

## Routes

| Need | Tool | Budget |
| --- | --- | --- |
| Active project code | codemap mode "ast" | bounded by query |
| Inspiration discovery (cross-repo) | codemap mode "cgc", context <inspo-root>, domain query | one query, then drill per-repo |
| Inspiration repository | codemap mode "cgc", context <inspo-root>/<repo> | one repo per query |
| GitHub repository QA | mcp.deepwiki.ask_question | one question per repo |
| Library or API docs | mcp.context7.resolve-library-id then mcp.context7.query-docs | max three single-topic queries |
| Discovery and current facts | mcp.exa.omniroute_web_search | 3-5 results |
| Selected page content | OmniRoute fetch (web-fetch gateway in the exa namespace) | selected URLs only |

## Escalation Order

1. Local AST for active-project code.
2. Inspiration discovery, then per-repository CGC: one meta-context query over `<inspo-root>` (resolve from `$INSPO_ROOT` or ask the user; never assume a machine-specific path) to find the covering repo, then query that repo alone.
3. DeepWiki for a bounded GitHub overview or when CGC is unavailable.
4. Context7 for current versioned library documentation; resolve the library ID first unless the user gave /org/project[/version].
5. OmniRoute search for discovery and current facts.
6. OmniRoute fetch (the exa web-fetch gateway) for a URL already selected from the shortlist, never every result.

Move one step only after a named evidence gap: "the CGC context has no symbols for X", "Context7 lacks this version", "search shortlist lacks a primary source".

## Evidence Validity

A GitHub repository is never valid or authoritative evidence just because it relates to the task or project. Topical relevance is a lead, not a warrant. Treat any repository like an arXiv preprint: potentially valuable, always provisional. Extract claims only with provenance (owner/repo, commit SHA or branch, retrieval date, license); verify by reading the code, docs, and tests rather than the README; and cross-check any adopted claim against an independent source. Prefer primary, dated, versioned sources: official docs, release notes, tagged commits, and the repo's own test suite. A CGC clone is an indexed snapshot for navigation, not a truth store; it can lag HEAD.

## Anti-Splurge Rules

- **Dedup:** key findings by question plus source; never retrieve the same evidence twice through different tools.
- **Summarize before expand:** write a one-paragraph finding before pulling more.
- **Parallel only for independent angles:** never fire the same question at several tools.
- **Cap per source:** 3-5 search results, three Context7 queries, one DeepWiki question per repo, one fetch per selected URL.
- **Stop:** one primary source answered, or two independent sources agree. Otherwise report the open evidence gap and ask.

## Evidence Record

For each finding: claim, source tool, exact call, URL or context, date, confidence. Unknowns stay `[NEEDS CLARIFICATION: reason]`; no source, no claim.

## Red Flags

Fan-out across every tool; unbounded result counts; fetching every search hit; same question to two tools "to be safe"; treating a summary as a primary source; expanding a source before summarizing what it already gave; treating a topically-related repository as authoritative without provenance or verification; raw text search (rg/grep) against an inspiration clone instead of codemap mode "cgc".

<skill_result>
  <skill>evidence-router</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>One primary route per question, named gaps, bounded calls, compact evidence records</evidence>
  <artifacts>Routed evidence ledger</artifacts>
  <risks>Duplicate retrieval, unbounded expansion, or none</risks>
</skill_result>
