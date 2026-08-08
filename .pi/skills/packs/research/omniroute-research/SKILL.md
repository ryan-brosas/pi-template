---
name: omniroute-research
description: Primary general-web lane via OmniRoute. Use for current facts, news, discovery, official URL retrieval, extraction, links, metadata, screenshots, and bounded crawl. Supports explicit provider selection and automatic failover. Never for local code or versioned library docs.
---

# OmniRoute Research

OmniRoute is the **primary general-web and URL-fetch lane**. It exposes two MCP
tools backed by many providers with automatic failover and caching. The many
web-search providers are capabilities behind these tools—not separate host
tools.

> **Legacy alias:** the global MCP server may still be named `exa`. It points to
> OmniRoute, not standalone Exa. Until renamed, refs remain
> `mcp.exa.omniroute_web_search` and `mcp.exa.omniroute_web_fetch`.

Read-only and prewalk-compliant: calls gather evidence; they never mutate files
or advance workflow state.

## When to use

- Current facts, news, releases, comparisons, and vendor information.
- Broad discovery where the authoritative URL is unknown.
- Fetching official pages as markdown/HTML; extracting links/metadata.
- Screenshots, client-rendered extraction, or a bounded crawl.
- Cross-checking possibly stale Context7/DeepWiki results.

## When NOT to use

- Local symbols/call paths: codemap first; CGC for reference repositories.
- Versioned library/API docs: Context7 first.
- Public-repository architecture: DeepWiki/CGC first.
- Interactive/authenticated flows: browser tooling after fetch fails.
- Mutation, form submission, destructive action, or secret retrieval.

## Tool contract

Discover availability with `mcp.$search`; from Fabric use `tools.search` /
`tools.call`.

### `mcp.exa.omniroute_web_search`

| Field | Contract | Guidance |
| --- | --- | --- |
| `query` | required, 1–500 chars | one answerable question; include version/date when material |
| `max_results` | integer 1–20, default 5 | start 5; increase only for decision-changing diversity |
| `search_type` | `web` or `news`, default `web` | `news` only for time-sensitive reporting |
| `provider` | optional backend | omit for failover; pin only for comparison/recovery |

Search providers: `serper-search`, `brave-search`, `perplexity-search`,
`exa-search`, `tavily-search`, `google-pse-search`, `linkup-search`,
`searchapi-search`, `searxng-search`.

Output: `id`, selected `provider`, normalized `query`, ordered results (`title`,
`url`, optional `display_url`, `snippet`, positive `position`), `cached`, and
usage (`queries_used`, `search_cost_usd`). Snippets are discovery evidence, not
proof of a destination page’s complete claim.

### `mcp.exa.omniroute_web_fetch`

| Field | Contract | Guidance |
| --- | --- | --- |
| `url` | required non-empty URL | prefer canonical official URLs |
| `provider` | `firecrawl`, `jina-reader`, `tavily-search`, `tinyfish` | omit for failover; pin for required capability |
| `format` | `markdown`, `html`, `links`, `screenshot` | choose the smallest useful form; markdown default |
| `include_metadata` | boolean, default false | enable for title/description provenance |
| `depth` | integer 0–2, Firecrawl only | 0 single page; 1–2 bounded subtree only |
| `wait_for_selector` | CSS selector, Firecrawl only | stable client-rendered target only |

Output: selected `provider`, canonical `url`, extracted `content`, `links`,
nullable metadata (`title`, `description`), and nullable `screenshot_url`.

## Provider selection

Default to no provider and let OmniRoute fail over. Pin only with a recorded
reason:

- broad comparison: Serper, Brave, Google PSE, SearchAPI, SearXNG;
- synthesized discovery: Perplexity—then verify fetched sources;
- semantic/domain discovery: Exa, Linkup, Tavily;
- clean static page: Jina Reader;
- crawl, selector wait, links, screenshot: Firecrawl;
- difficult dynamic extraction: TinyFish.

Configuration varies: a pin can fail while automatic routing succeeds. Never
claim all providers ran when output identifies one provider.

## Workflow

1. State the evidence question and why another lane is not better.
2. Discover the tool/schema through `mcp.$search`.
3. Search broad then narrow: start at 5 results; record provider/cache/usage.
4. Prefer primary sources and fetch the destination—not only its snippet.
5. Fetch minimally: markdown first; metadata/links/screenshot/crawl only when
   required by the question.
6. Triangulate contested current claims with an authoritative source or two
   independent sources. Preserve disagreement.
7. Return structured evidence to research-router/prewalk; never imply a call ran
   without an actual host result.

Example search:

```json
{"query":"official Node.js 24 release notes","max_results":5,"search_type":"web"}
```

Example fetch:

```json
{"url":"https://nodejs.org/en/blog/release/v24.0.0","format":"markdown","include_metadata":true,"depth":0}
```

## Evidence contract

For each accepted fact return: question, claim, canonical source URL/title,
primary/secondary classification, search ref/query/provider/cache/position,
fetch ref/provider/format/depth, retrieval time, minimal excerpt, confidence,
caveat, and decision impact. Keep URL and `screenshot_url` together. Usage/cost
is telemetry—not correctness evidence.

## Failure recovery

| Failure | Recovery |
| --- | --- |
| weak results | rewrite with official domain/version/date, then alternate backend |
| pinned provider fails | remove pin for failover or justify an alternate |
| stale/conflicting sources | fetch authoritative release/spec/status pages |
| empty/blocked fetch | Jina, Firecrawl, TinyFish; then webclaw; browser last |
| client-rendered page | Firecrawl + stable selector; do not guess repeatedly |
| excessive crawl | reset depth 0 and fetch decision-relevant links only |
| screenshot needed | format screenshot; preserve page URL + screenshot URL |
| tool missing | use generic discovery/call and report unavailable honestly |

## Stop conditions

Stop when the decision has authoritative evidence, disagreements are recorded,
and every claim has a retrievable URL/tool ref. Stop after two failed query
strategies and report the gap; do not search merely to increase result count.

---
source: /home/ryanj/work/projects/omniroute-fork/open-sse/mcp-server/schemas/tools.ts
license: OmniRoute repository; see docs/sources.md
adapted: authoritative schemas at tools.ts:436-554 and registrations at server.ts:961-980; prewalk lifecycle seams only
