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
- `references/graphiti-orchestrator.md` — add_episode, bulk, and saga summarization.
- `references/driver.md` — the GraphDriver ABC (Cypher queries, sessions, transactions, node ops) across Neo4j/FalkorDB/Kuzu/Neptune.
- `references/edges.md` — the bi-temporal fact-edge model (save, get_by_uuid, embedding).
- `references/content-chunking.md` — density-gated chunking (token estimate, JSON/text split with overlap).
- `references/llm-client.md` — provider-agnostic LLM client (input cleaning, retry, caching, token tracking).
- `references/dedup.md` — MinHash + LSH fuzzy dedup with entropy gating.
- `references/attribute-capping.md` — cap string/list attributes against schema-description bleed.
- `references/community-detection.md` — label-propagation community clustering.
- `references/datetime-text-utils.md` — UTC normalization, sentence-boundary truncation.

## Capsule map
- **Bi-temporal facts** — `references/bitemporal.md`, `references/edges.md`: valid_at/invalid_at/expired_at edges, contradiction resolution, fact-edge model.
- **Retrieval** — `references/search.md`, `references/nodes.md`: hybrid-search recipes, extraction batching, dedup.
- **Orchestration** — `references/graphiti-orchestrator.md`: add_episode/bulk, saga summarization.
- **Drivers** — `references/driver.md`: the GraphDriver ABC across Neo4j/FalkorDB/Kuzu/Neptune.
- **Ingestion utilities** — `references/content-chunking.md`, `references/attribute-capping.md`, `references/dedup.md`, `references/datetime-text-utils.md`: density-gated chunking, attribute caps, MinHash+LSH dedup, UTC/sentence helpers.
- **LLM & communities** — `references/llm-client.md`, `references/community-detection.md`: provider-agnostic client, label-propagation clustering.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `graphiti` (`/mnt/hdd/utopia/inspo/graphiti`); 4,157 nodes / 20,368 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the bi-temporal edge model, contradiction arithmetic, hybrid-search recipe, orchestrator, and driver abstraction; adapt driver dialects and embedding providers; omit Graphiti-specific pipelines and prompts unless a target requires them.
