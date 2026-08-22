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

## Capsule map
- **Bi-temporal facts** — `references/bitemporal.md`: valid_at/invalid_at/expired_at edges with arithmetic contradiction invalidation.
- **Retrieval & drivers** — `references/search.md`, `references/nodes.md`: named hybrid-search recipes over one GraphDriver across Neo4j/FalkorDB/Neptune/Kuzu.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `graphiti` (`/mnt/hdd/utopia/inspo/graphiti`); 4,157 nodes / 20,368 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the bi-temporal edge model, contradiction arithmetic, and hybrid-search recipe; adapt driver dialects and embedding providers; omit Graphiti-specific pipelines and prompts unless a target requires them.