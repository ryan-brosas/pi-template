# Aider — Repo Map Reference

Read in full: `aider/repomap.py` (867 lines). Ranking in get_ranked_tags with networkx pagerank weight/personalization args; tolerant tag parsing via get_tags + the sqlite TAGS_CACHE in `aider/repomap.py:217-224`; rendering by to_tree over TreeContext (the `aider/grep_ast` wrapper); token counting sampled in token_count:97-101; map caching under the `refresh` modes at :576-628. Token budget fitting: middle = max_map_tokens//25 binary search at :652-691 plus token_count sampling. Security: `aider/ignore.py` (gitignore-aware path filtering).

Source-grounded reference for `aider/repomap.py` (867 lines, read in full). Graph: 7,507 nodes / 19,923 edges; entry points include `aider.repomap.main`.

## WHAT: a PageRank-ranked, token-budgeted repository outline

The repo map shows an LLM the shape of the repo — files as tree-sitter outlines of the IMPORTANT code — inside a strict token budget. It is the answer to "how does the model know about code it hasn't opened?"

## WHERE
- Tag extraction :233-363 (tree-sitter via grep_ast; sqlite TAGS_CACHE versioned by tree-sitter pack, CACHE_VERSION 3/4)
- Ranking :365-573 (`get_ranked_tags` — networkx MultiDiGraph + personalized PageRank)
- Map cache + refresh policies :576-628
- Binary-search fitting :629-707
- Tree rendering :710-785

## WHY each ranking decision

Edges are file→file, weight = ident references. On top:

- **Personalization**: chat files, mentioned fnames, and mentioned IDENTIFIERS matching any PATH COMPONENT get boosted starting rank (:398-431) — mentioning `auth_user.py` or the identifier `AuthUser` tilts the whole map toward that area.
- **×10 for distinctive identifiers**: snake/kebab/camelCase names ≥8 chars multiply edge weight ×10 (:498-501). A long camelCase name is almost certainly project-specific; short generic names are noise.
- **×0.1 for `_private` and ×0.1 when >5 definers** (:502-504): private helpers and widely-defined names carry little navigational value.
- **×50 when the REFERENCER is in chat** (:511-512): what your open files reference matters most.
- **sqrt(num_refs)** (:514): high-frequency mentions scale down so ubiquitous idents don't dominate every edge.
- **Self-edges for defs without refs** (:472-478): documented tree-sitter quirk (ruby 0.23.2 counts a def as only a def); weight 0.1 keeps them discoverable.
- **Chat files are EXCLUDED from output** but their rank FLOWS through out-edges (:559-562): the map spends its budget on what chat files POINT TO, not on repeating what the model already has.
- **Special files force-included** ahead of ranking (`filter_important_files`: README, configs).

## HOW the budget is hit

Binary search over tag count (:652-691): start `middle = max_tokens // 25`, render `to_tree(ranked_tags[:middle])`, count tokens (SAMPLED above 200 chars — every Nth line scaled), accept within 15% error, keep best-seen. Rendering caches per `(rel_fname, sorted-lois, mtime)` and truncates lines at 100 chars against minified JS.

Resilience details worth porting: map cache has FOUR refresh policies (`manual/always/files/auto`) where **auto caches only when generation took >1s** — cheap maps stay fresh, expensive ones get cached; `RecursionError` on huge repos DISABLES the map with a message rather than crashing; sqlite cache errors degrade to in-memory; initial scans >100 uncached files show a progress bar with the honest message "Initial repo scan can be slow in larger repos, but only happens once."

## The lesson
A repo map is a RANKING problem, not an indexing problem: personalization from conversation context (mentioned names/idents/paths) + edge-weight heuristics encoding "what makes an identifier distinctive" + a hard token budget fitted by binary search. Cache aggressively but only what's expensive.

## Capsule evidence (current source)
- **Path/Symbol:** `aider/repomap.py` — `RepoMap.get_ranked_tags(chat_fnames, other_fnames, mentioned_fnames, mentioned_idents, progress=None)`.
- **Flow:** tags form a weighted graph; personalization and identifier heuristics feed PageRank; ranked definitions become the map.
- **Invariant:** chat files contribute rank through references but are not emitted.
- **Probe:** rank a mentioned identifier and verify its target appears while the chat file does not.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "RepoMap get_ranked_tags"})`.
