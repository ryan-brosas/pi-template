---
name: context7-docs
description: Authoritative library and API documentation lookups via Context7. Use when you need up-to-date, versioned documentation for a specific library, framework, or API instead of guessing. Always resolve the library ID first, then query a topic; fall back to generic search or OmniRoute fetch when Context7 is absent or stale.
---

# Context7 Docs

Context7 is the authoritative lane for **library and API documentation**. It
returns curated, up-to-date doc snippets for 37k+ libraries, replacing outdated
API guessing. This skill is read-only and never bypasses prewalk.

## When to use

- You need the current API for a specific library, framework, or SDK (React
  hooks, Stripe SDK, Astro config, etc.).
- You are writing code against a library and want version-correct usage.
- You want to confirm a syntax or option before implementing.

## When NOT to use

- **Local code questions** — use codemap/CGC on the repository, never an
  external docs lookup.
- **General web facts / news / current events** — that is the OmniRoute lane
  (`omniroute-research`).
- **Public-repository architecture Q&A** — that is DeepWiki
  (`deepwiki-repositories`).
- When the answer is versioned and MUST match exactly — treat Context7 as the
  primary source but verify a contradictory claim against the official docs
  via `mcp.exa.omniroute_web_fetch`.

## Tool contract

Provider: `mcp.context7.query-docs` (installed as `@upstash/context7-mcp@3.2.5`;
no credentials are embedded in this template).

Two-step sequencing — never skip the resolve step:

1. `mcp.context7.resolve-library-id`
   - inputs: `libraryName` (e.g. "react"), optional `query` to disambiguate.
   - output: candidate `libraryId` values such as `/reactjs/react.dev`.
2. `mcp.context7.query-docs`
   - inputs: `libraryId` (from step 1), `topic` (e.g. "hooks", "setup", "API
     reference"), optional `version`.
   - output: documentation snippet for the topic.

Generic discovery first: run `mcp.$search` with the library + topic to let the
bridge rank Context7 against every search-capable tool; when Context7 is
unavailable, fall back to `mcp.exa.omniroute_web_search` + `mcp.exa.omniroute_web_fetch`.

## Workflow

1. Identify the exact library name and the topic you need.
2. Resolve the library ID (`resolve-library-id`). If multiple candidates, pick
   the one matching your package/version; ask when ambiguous.
3. Query docs (`query-docs`) with `libraryId` + `topic` (+ `version`).
4. If the answer must be exact and the snippet is thin, fetch the official docs
   page with `mcp.exa.omniroute_web_fetch` and cite the URL.
5. Record evidence: libraryId, topic, version, snippet source, URL.

## Evidence contract

- Every non-trivial claim cites the libraryId + topic (and version when used).
- Snippets are evidence only for the queried version; do not generalize across
  major versions.
- When Context7 has no entry, state that you checked Context7 and cite what
  replaced it (official docs URL fetched via OmniRoute).

## Failure recovery

| Symptom | Recovery |
| --- | --- |
| `resolve-library-id` not found | try a variant name; fall back to `mcp.$search` for the library docs URL |
| `query-docs` empty or thin | simpler topic ("useState" not "state management"); or `version`-specific query |
| Context7 server absent | `mcp.$search` → `mcp.exa.omniroute_web_search` → official docs via `mcp.exa.omniroute_web_fetch` |
| Stale / contradicts official docs | fetch the official page; cite the official URL; note the conflict |
| Rate limit / invalid key | wait, reduce call volume, or use the fetch fallback; never retry blindly |

## Stop conditions

- The topic is answered with a usable snippet or official URL.
- You confirmed the exact version behavior you needed.
- After two failed attempts at the same lookup, stop and switch fallback
  instead of retrying the same path.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/tool/context7.ts
adapted: synthesized into a pi skill with prewalk authority; resolve→query contract from the opencode Context7 tool
license: opencode-template; see docs/sources.md
-->
