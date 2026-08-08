---
name: research-router
description: Route any research request to the correct lane and provider with exact tool refs and fallback order. Use at the start of any research task: local code (codemap/CGC), library docs (Context7), public-repository Q&A (DeepWiki), or general web facts/fetch (OmniRoute). Discovery first via mcp.$search; read-only, prewalk-compliant.
---

# Research Router

Decide where evidence comes from BEFORE calling anything, then execute the
lane. Research is the first prewalk phase and is strictly read-only.

## When to use

- Any task that needs external facts, docs, repository understanding, or code
  evidence.
- At the start of `workflow-deep-research` and before drafting a prewalk
  checklist schema.

## When NOT to use

- Pure local implementation or review with all evidence in-repo (skip research).
- When the caller already named the provider/skill.

## Intent routing

| Intent | Lane | Provider | Refs |
| --- | --- | --- | --- |
| Library/API docs, versioned usage | library-docs | Context7 | `mcp.context7.query-docs` (+ `resolve-library-id` first) |
| Unfamiliar public-repository architecture / wiki | repo-qa | DeepWiki | `mcp.deepwiki.read_wiki_contents`, `mcp.deepwiki.ask_question` |
| Current web facts, news, general search, URL fetch | general-web | OmniRoute | `mcp.exa.omniroute_web_search`, `mcp.exa.omniroute_web_fetch` |
| Local code symbols/call paths | code | codemap/CGC | codemap search/source/refs/cascade |

## Tool contract

- Discovery first: `mcp.$search` classifies intent, ranks capable MCP tools,
  and falls back across them; read its provenance to report which server/tool
  answered.
- Named fallbacks only when `$search` is unavailable: OmniRoute web search /
  fetch, Context7 docs, DeepWiki repo Q&A (refs above).
- From a Fabric run the same bridge is `tools.search` / `tools.call`.

## Fallback order

1. `mcp.$search` (generic discovery, ranks providers).
2. Lane provider (Context7 / DeepWiki / OmniRoute per the table).
3. Lane fallback: official docs via OmniRoute fetch; CGC or local clone for
   repos; explicit "checked, unavailable" reporting — never fabricate.

## Workflow

1. Classify the intent (table above).
2. Run `mcp.$search` with the question; note provenance.
3. Execute the lane provider; gather evidence with file:line or URL locators.
4. Produce references (repository, question, evidenceRefs) for the prewalk
   schema.

## Evidence contract

- Every non-trivial claim has a locator (URL or file:line).
- State which provider answered; separate verified facts from assumptions.
- Absence of evidence is not evidence of absence — report what you checked.

## Failure recovery

| Symptom | Recovery |
| --- | --- |
| Lane provider unavailable | fall back per lane; report the gap |
| Wrong lane for the intent | re-classify (e.g. repo question vs general web) |
| No results anywhere | narrow the question; stop after two attempts |

## Stop conditions

- Every open question has at least one evidence ref.
- The recommendation is supported and further search is unlikely to change it.

<!--
source: /home/ryanj/.pi/agent/research-enforcement.json
adapted: synthesized into a pi skill with prewalk authority; routes from installed research-enforcement.json categories
license: personal Ultra Fabric config; see docs/sources.md
-->
