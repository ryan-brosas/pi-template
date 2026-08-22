---
name: graphiti-foundation
description: "Use when building agent memory over knowledge graphs: bi-temporal fact edges, arithmetic contradiction invalidation, hybrid-search resolution pipelines, and multi-driver graph abstractions."
disable-model-invocation: true
---
# Graphiti Foundation

## Use this for
Agent memory over a knowledge graph where facts are bi-temporal, contradictions invalidate via arithmetic, and retrieval is a named hybrid-search recipe behind one driver. Source and direct tests are ground truth; the capsules carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/bitemporal.md` — the four-clock edge model, resolution pipeline, contradiction arithmetic.
- `references/search.md` — hybrid composition, rerankers, fail-closed fulltext construction, filter scaffolding, cost-tier recipes.
- `references/nodes.md` — extraction batching, three-tier dedup with defensive LLM guardrails, summary flights, node taxonomy traps.
- `references/graphiti-orchestrator.md` — add_episode/bulk flow, saga summarization.
- `references/add-episode-contract.md` — the steerable ingestion signature (typed schemas, exclusions, edge_type_map, custom instructions).
- `references/driver.md` — the GraphDriver ABC (Cypher queries, sessions, transactions, node ops) across Neo4j/FalkorDB/Kuzu/Neptune.
- `references/edges.md` — the bi-temporal fact-edge model (save, get_by_uuid, embedding).
- `references/node-model-namespaces.md` — provider-matched deletes + namespace repositories.
- `references/search-rerankers.md` — RRF, MMR, node-distance, episode-mentions.
- `references/search-primitives.md` — fulltext/similarity/BFS per node/edge/episode/community with provider fallbacks.
- `references/retrieval-for-update.md` — relevant nodes/edges + invalidation candidates.
- `references/bulk-dedup.md` — UnionFind canonicalization + combined extraction.
- `references/node-resolution-summaries.md` — LLM-confirmed merges + flight-batched summarization.
- `references/content-chunking.md` — density-gated chunking (token estimate, JSON/text split with overlap).
- `references/llm-client.md` — provider-agnostic LLM client (input cleaning, retry, caching, token tracking).
- `references/dedup.md` — MinHash + LSH fuzzy dedup with entropy gating.
- `references/attribute-capping.md` — cap string/list attributes against schema-description bleed.
- `references/community-detection.md` — label-propagation community clustering.
- `references/cross-encoder-embedder.md` — LLM-as-judge reranking via logprobs + embedding ABC.
- `references/prompt-library.md` — versioned prompts-as-code + group-id fan-out decorator.
- `references/tracing.md` — NoOp/OpenTelemetry spans behind one ABC.
- `references/datetime-text-utils.md` — UTC normalization, sentence-boundary truncation.

## Capsule map
- **Bi-temporal facts** — `bitemporal`, `edges`: valid_at/invalid_at/expired_at clocks, contradiction arithmetic, fact-edge lifecycle.
- **Retrieval** — `search`, `search-primitives`, `search-rerankers`, `retrieval-for-update`: recipes, primitive matrix (kind × mode), RRF/MMR/distance fusion, update-driven candidate lookup.
- **Ingestion & resolution** — `nodes`, `add-episode-contract`, `node-resolution-summaries`, `bulk-dedup`, `dedup`, `content-chunking`, `attribute-capping`: steerable extraction, LLM-confirmed merges, union-find canonicalization, density-gated chunking.
- **Infrastructure** — `graphiti-orchestrator`, `driver`, `node-model-namespaces`, `llm-client`, `cross-encoder-embedder`, `prompt-library`, `tracing`, `community-detection`, `datetime-text-utils`: orchestration, driver ABCs, namespaces, clients, observability.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `graphiti` (`/mnt/hdd/utopia/inspo/graphiti`); 36,684 lines of source; confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the bi-temporal edge model, contradiction arithmetic, search recipe matrix, resolution pipeline, and infrastructure ABCs; adapt driver dialects and embedding providers; omit Graphiti-specific pipelines and prompts unless a target requires them.
