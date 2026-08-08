---
name: deepwiki-repositories
description: Public-repository Q&A lane via DeepWiki. Use when you need architecture, wiki contents, or targeted answers about an unfamiliar public repository. Never a general web search; for local code use codemap/CGC instead. Fall back to CGC/local clone/GitHub/OmniRoute when DeepWiki is unavailable.
---

# DeepWiki Repositories

DeepWiki answers questions about **public repositories** (architecture, module
organization, wiki contents). It is a repository-Q&A lane, not a web-search
duplicate. Read-only, prewalk-compliant.

## When to use

- You need to understand an unfamiliar public repository before using or
  modifying it.
- You want wiki contents or an architectural overview of a repo you do not
  have locally.
- You have a targeted question ("how does the plugin system load config?") for
  a public repo.

## When NOT to use

- **Local code** — use codemap/CGC on the local clone; DeepWiki answers about
  code you can read are a fallback, never the primary evidence.
- **General web facts / library docs / news** — those are the OmniRoute and
  Context7 lanes.
- **Proprietary or private repositories** — DeepWiki only indexes public repos.

## Tool contract

Provider: `mcp.deepwiki.read_wiki_contents` and `mcp.deepwiki.ask_question`.

- `mcp.deepwiki.read_wiki_contents` — inputs: repository (e.g. `owner/repo`),
  optional path/topic; returns generated wiki pages for the repo.
- `mcp.deepwiki.ask_question` — inputs: repository, question; returns a
  synthesized answer with repository references.

Discovery first: `mcp.$search` with the repository + question; then DeepWiki
when the lane matches. Fallback order when DeepWiki is unavailable: CGC or a
local clone (shallow clone under /tmp), then GitHub search/fetch via OmniRoute,
then explicit "repo not indexed" reporting.

## Workflow

1. Confirm the question is about an unfamiliar **public** repository.
2. If the repo is (or can be) local, prefer codemap/CGC or a shallow clone
   FIRST; DeepWiki confirms the mental model.
3. Otherwise read wiki contents, then ask the targeted question.
4. Cross-check any claim that will drive changes against source (wiki → source
   file:line via local clone, GitHub, or OmniRoute fetch).
5. Record evidence: repository, wiki page, excerpt, and any source locator.

## Evidence contract

- Answers cite the repository and the wiki page or excerpt.
- Claims about local code must be verified against source (codemap file:line);
  DeepWiki is corroboration, not primary evidence, for local code.
- If DeepWiki has no page for the repo, state that explicitly and what you used
  instead.

## Failure recovery

| Symptom | Recovery |
| --- | --- |
| Repo not indexed / no wiki | CGC or shallow clone; GitHub code search via OmniRoute fetch |
| Answer too generic | ask a narrower question; read the wiki page for the module |
| Provider absent | `mcp.$search` → local clone / GitHub → OmniRoute |
| Answer conflicts with code you can see | trust the code; record the conflict |

## Stop conditions

- You have an architectural model with at least one source-anchored fact.
- The targeted question is answered with an excerpt or locator.
- After two failed attempts, stop and fall back instead of retrying DeepWiki.

<!--
source: /home/ryanj/.pi/agent/research-enforcement.json
adapted: synthesized into a pi skill with prewalk authority; repository-Q&A lane definition
license: personal Ultra Fabric config; see docs/sources.md
-->
