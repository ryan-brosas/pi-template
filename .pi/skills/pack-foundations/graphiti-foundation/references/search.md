# Graphiti — Search Subsystem Reference

(Source-grounded; read in full: `search/search_utils.py` (2,048 lines), `search/search.py` (874 lines), `search/search_config_recipes.py`.)

Complete source-grounded reference for graphiti's retrieval layer. Files: `graphiti_core/search/search_utils.py` (2,048 lines), `search/search.py` (874 lines), `search/search_config_recipes.py` — all walked in full.

## The orchestrator: pay for embeddings only when needed

Top-level `search()` (search.py) short-circuits empty queries to an empty `SearchResults`, then decides whether the query needs embedding AT ALL — only if some configured scope uses cosine similarity or an MMR reranker. Otherwise a zero sentinel vector (`[0.0] * EMBEDDING_DIM`, :141-152) keeps signatures uniform without Optional plumbing. Embedding is the expensive external call; BM25-only configs never pay for it. Newlines are stripped pre-embed because "some embedders/indexes treat them poorly" (:148).

The four scopes (edges, nodes, episodes, communities) then fan out concurrently under one semaphore (`semaphore_gather`), each returning `(items, scores)` assembled into SearchResults with per-scope reranker scores. Tracing wraps every phase via a `_trace_phase` contextmanager.

**Lesson:** compute expensive inputs (embeddings) lazily and only when a downstream consumer requires them; keep a cheap sentinel to preserve uniform interfaces.

**Probe:** a config whose scopes use only bm25 must never invoke the embedder (sentinel path); empty query returns empty results without touching the driver.

## Hybrid composition: over-fetch 2x, dedup by UUID, dispatch one reranker

Each scope builds one task per configured method (bm25 fulltext, cosine similarity, BFS), runs them concurrently at **2× limit** each, dedups into a uuid→object map, then hands the ranked-id list to exactly ONE reranker before truncating to limit.

The 2× overshoot compensates for overlap between result sets after dedup. The uuid-map pattern is the load-bearing abstraction: rerankers operate on opaque ID lists, so RRF/MMR/cross-encoder/node-distance all share one dispatch shape.

BFS gets an auto-expansion behavior worth noting: when bfs is configured but no origin nodes are supplied, first-round search results' source nodes seed a second BFS pass (:326-353) — "expand the graph around whatever lexical/vector search found" without callers supplying origins.

Episode search supports only bm25 retrieval; community search hardcodes fulltext+similarity.

**Lesson:** over-fetch (2×) then dedup-then-rerank is the canonical hybrid-search pipeline shape; make rerankers operate on ranked ID lists so any scorer swaps in behind one interface.

**Probe:** with bm25+cosine at limit=N, assert each underlying search received limit=2N; overlapping result sets must union-dedup through the uuid map.

## Five rerankers, five cost/fidelity tradeoffs

| Reranker | Cost | Behavior |
|---|---|---|
| RRF | free | sums 1/(rank+const) across sets (:1763-1779) |
| MMR | O(n²) similarity matrix | relevance vs redundancy; L2-normalized embeddings; note max_sim runs against ALL candidates, not just selected ones (:1885-1924) |
| cross-encoder | model inference PER CANDIDATE | ranks natural-language keys (edge.fact / node.name / episode.content) but only the FIRST `limit` candidates — it never sees the other half of the 2× funnel (:397, :594-600) |
| node_distance | cheap after RRF | seeds with RRF ordering, then reorders by graph proximity to a center node; raises SearchRerankerError without one (:412-414); unreachable nodes get float('inf') whose reciprocal 0 survives min_score=0 filtering |
| episode_mentions | cheap | reorders by count of mentioning episodes |

The cross-encoder cap deserves emphasis: capping happens BEFORE scoring (:397), bounding latency at the cost of recall beyond limit — a deliberate latency/quality trade encoded in pipeline order, not configuration.

**Lesson:** cap model-based reranking by candidate budget BEFORE scoring, not after; use cheap rank-fusion as both a standalone reranker and a seeding stage for structural rerankers.

**Probe:** rrf([[a,b],[b,c]]) must rank b first (present in both sets); node_distance_reranker with min_score=0 must still include disconnected nodes since 1/inf = 0 ≥ 0.

## Fulltext query construction: fail closed to empty

`fulltext_query` (:85-114) branches per driver: Kuzu gets the raw query back ("Kuzu only supports simple queries"), FalkorDB delegates to the driver, everything else gets group_id OR-filters prepended and a `lucene_sanitize()`d parenthesized query. Then the guard:

> If the sanitized query plus group filter exceeds MAX_QUERY_LENGTH (128) words, return '' — and every caller treats '' as "return no results" (:198-201).

A would-be injection or index-crashing query degrades to an EMPTY RESULT SET instead of raising. (One latent quirk flagged by the study: the length check adds `len(group_ids or '')` — a string length, not list length.)

Security tests mine exactly this surface: test_search_security.py covers invalid group ids, backtick stripping, stopwords-only and punctuation-only queries returning empty, and default-group-id escaping.

**Lesson:** treat untrusted query text as fail-closed — sanitize, bound length, degrade to empty results rather than letting malformed fulltext syntax reach the database.

**Probe:** a >128-word query yields `[]` from node_fulltext_search, not an exception.

## Filters as parameterized clause lists

Every retrieval primitive composes WHERE clauses from ONE provider-aware constructor returning `(filter_queries, filter_params)` — values travel as `$params`, never interpolated. Group scoping layers on identically per primitive (`e.group_id IN $group_ids` / `n.group_id …`), duplicated because the alias differs per query. BFS constrains traversal doubly: same-group origins AND destinations (:800-802).

Provider quirks absorb at three named seams: Kuzu casts the search vector (`CAST($search_vector AS FLOAT[n])`), Neptune stores embeddings as comma strings parsed on read, Neptune cosine runs Python-side then hydrates via UNWIND (:349-404).

**Lesson:** compose WHERE clauses as (string, params) pairs from one provider-aware constructor; never interpolate filter values into query text.

**Probe:** generated queries contain only $param placeholders matching filter_params keys; group_ids=['a'] returns no group-b rows.

## Recipes encode cost tiers (and their comments rot)

Sixteen preset configs: three COMBINED_* (all scopes), five EDGE_HYBRID_*, five NODE_HYBRID_*, three COMMUNITY_HYBRID_*. The tiers tell a story:

- **RRF variants** are the minimal bm25+cosine fast tier.
- **MMR variants** ship with `mmr_lambda=1` — which makes the diversity term vanish ((λ−1)·max_sim = 0), reducing MMR to pure relevance. Diversity is opt-in by lowering λ toward DEFAULT_MMR_LAMBDA=0.5 (:66).
- **Cross-encoder variants ADD the bfs method** (wider candidate funnel) while SHRINKING limits (10/10/3) — wider funnel, smaller final cut, because each candidate costs a model call.

And a caution for recipe maintainers: two comments are WRONG (the node cross-encoder recipe's comment says "episode mentions reranking"; the community cross-encoder comment says "mmr"). Recipe comments rot — audit them.

**Lesson:** ship curated presets encoding cost/quality tiers rather than exposing raw combinatorial config — and audit recipe comments, they rot.

**Probe:** EDGE_HYBRID_SEARCH_CROSS_ENCODER.limit == 10 with bfs in its methods; COMBINED_MMR's three mmr_lambda values all == 1; every COMBINED recipe's episode scope uses bm25 only.
