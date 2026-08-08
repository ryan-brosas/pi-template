# Research routing

Research is the first prewalk phase and is strictly read-only. The router
(`research-router`) decides the lane BEFORE any call; `mcp.$search` is the
discovery first step, and named refs are fallbacks.

## Decision table

| Need | Lane | Provider | Primary refs | Fallback when unavailable |
| --- | --- | --- | --- | --- |
| Library/API docs, versioned usage | library-docs | Context7 | `mcp.context7.query-docs` (resolve `resolve-library-id` first) | `mcp.$search` -> OmniRoute fetch of official docs |
| Unfamiliar public-repository architecture / wiki | repo-qa | DeepWiki | `mcp.deepwiki.read_wiki_contents`, `mcp.deepwiki.ask_question` | CGC or local clone -> GitHub -> OmniRoute |
| Current web facts, news, general search | general-web | OmniRoute | `mcp.exa.omniroute_web_search` | `mcp.$search` -> alternate provider |
| URL fetch / extraction (markdown, links, screenshot) | general-web | OmniRoute | `mcp.exa.omniroute_web_fetch` | webclaw_scrape -> browser tools |
| Local code symbols/call paths | code | codemap/CGC | codemap search/source/refs/cascade | grep (literal text only) |
| Provider failure / quota / rate limit | varies | — | report + switch | per-lane recovery in each skill |

## Providers

- **OmniRoute** — primary general web and fetch. Local endpoint
  `http://127.0.0.1:20128/api/mcp/stream`; gateway failover across Serper,
  Brave, Perplexity, Exa, Tavily, Google PSE, Linkup, SearchAPI, SearXNG (and
  Firecrawl, Jina Reader, TinyFish for fetch).
- **Context7** — `@upstash/context7-mcp@3.2.5`; resolve library ID then query
  topic (+ optional version). No credentials embedded here.
- **DeepWiki** — `https://mcp.deepwiki.com/mcp`; repository wiki contents and
  targeted questions for public repos.

## Legacy `exa` alias

The global MCP config (`~/.config/mcp/mcp.json`) names the OmniRoute endpoint
`exa`. It is NOT the standalone Exa product. The template refers to the lane as
`omniroute`, detects the alias, and recommends renaming the server to
`omniroute` outside the template. Until renamed, refs keep the installed
`mcp.exa.*` names.

## Enforcement mapping

The installed `research-enforcement.json` mirrors these lanes: context7
(`mcp.context7.query-docs`), exa/OmniRoute
(`mcp.exa.omniroute_web_search`/`omniroute_web_fetch`), codex-search,
xai-web-search, and deepwiki — all `authoritative: true`.

## Setup

1. `mkdir -p .mcporter` (gitignored).
2. Copy `mcp/omniroute.example.json` and/or `mcp/deepwiki.example.json` to
   `.mcporter/config.json` (merge servers).
3. Optional env: `CONTEXT7_API_KEY`, `DEEPWIKI_API_KEY` (see `.env.example`).
4. `research_guidance` reports readiness and the exact refs to call.
