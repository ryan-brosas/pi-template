---
name: omniroute-research
description: Primary general-web research lane via OmniRoute. Use for current web facts, news, general search, and URL fetch/extraction (markdown, links, screenshots). OmniRoute's gateway fails over across providers; the legacy global MCP alias named exa is actually this OmniRoute endpoint. Never for local code (codemap/CGC) or library docs (Context7).
---

# OmniRoute Research

OmniRoute is the **primary general-web and fetch lane**. It is a local MCP
endpoint (`http://127.0.0.1:20128/api/mcp/stream`) whose gateway fans out to
many search/fetch providers (Serper, Brave, Perplexity, Exa, Tavily, Google
PSE, Linkup, SearchAPI, SearXNG; Firecrawl, Jina Reader, TinyFish) with
automatic failover and caching. Read-only, prewalk-compliant.

> **Legacy alias:** the global MCP config currently names this server `exa`
> (see `~/.config/mcp/mcp.json`). That is an OmniRoute transport label, not the
> standalone Exa product. The template refers to the lane as `omniroute` and
> documents renaming the alias outside the template; until then the refs below
> keep the installed `mcp.exa.*` names.

## When to use

- Current web facts, news, or general questions.
- Fetching and extracting a URL (markdown, links, screenshots).
- Page content for a library before Context7 decides (see `context7-docs`).
- When `mcp.$search` routes a web intent to a search-capable tool.

## When NOT to use

- **Local code** — codemap/CGC, never web search.
- **Library/API docs** — Context7 is authoritative (`context7-docs`).
- **Public-repository architecture Q&A** — DeepWiki (`deepwiki-repositories`).
- Static HTML you can already read locally.

## Tool contract

Provider refs: `mcp.exa.omniroute_web_search`, `mcp.exa.omniroute_web_fetch`
(and `mcp.exa.omniroute_tool_search` to discover the tool catalog).

`omniroute_web_search` inputs:

- `query` (required, <=500 chars)
- `max_results` (int 1-20, default 5)
- `search_type` (`web` | `news`, default `web`)
- `provider` (optional; one of serper-search, brave-search, perplexity-search,
  exa-search, tavily-search, google-pse-search, linkup-search, searchapi-search,
  searxng-search)

`omniroute_web_fetch` inputs:

- `url` (required)
- `provider` (optional; firecrawl, jina-reader, tavily-search, tinyfish)
- `format` (`markdown` | `html` | `links` | `screenshot`, default `markdown`)
- `include_metadata` (bool, default false)
- `depth` (int 0-2; Firecrawl crawl depth)

Discovery first: run `mcp.$search` with the intent and let the bridge rank the
capable tools; fall back to the named refs only when `$search` is unavailable.

## Workflow

1. Route the intent: general web facts -> this lane.
2. Search with a precise query; read `results[].title/url/snippet/position` and
   the `usage` block (queries_used, search_cost_usd).
3. If snippets are not enough, fetch the best URL as markdown.
4. For dynamic or protected pages, escalate: web_fetch -> webclaw_scrape ->
   browser tools (see pi-core webclaw/browser-tools patterns).
5. Record evidence: URL, title, snippet, position, provider, and fetch source.

## Evidence contract

- Every claim cites a URL + snippet (or fetched content) with the provider.
- Distinguish search result text from page content; never invent URLs.
- Note the `cached` flag and usage cost when they matter.

## Failure recovery

| Symptom | Recovery |
| --- | --- |
| Provider quota/rate limit | re-route via `provider` param or let failover pick another backend |
| 403 / bot protection on fetch | webclaw_scrape, then browser tools |
| OmniRoute server absent | `mcp.$search` generic fallback; report the gap |
| Wrong/stale results | add freshness (search_type news, date terms) and re-fetch the source |

## Stop conditions

- The question is answered with at least one verifiable URL + snippet.
- The target page is fetched and the needed fact extracted.
- After two failed searches for the same fact, stop and change approach.

<!--
source: /home/ryanj/work/projects/omniroute-fork/open-sse/mcp-server/schemas/tools.ts
adapted: synthesized into a pi skill with prewalk authority; schemas from omniroute_web_search/web_fetch
license: OmniRoute fork; see docs/sources.md
-->
