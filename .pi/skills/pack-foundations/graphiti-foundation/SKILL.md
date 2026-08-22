---
name: graphiti-foundation
description: "Use when building agent memory over knowledge graphs: bi-temporal fact edges, arithmetic contradiction invalidation, hybrid-search resolution pipelines, and multi-driver graph abstractions."
disable-model-invocation: true
---

# Graphiti Foundation

## Solves
Temporal agent memory on a graph: facts that change over time are stored with event-time AND ingestion-time stamps, contradictions are resolved by arithmetic rather than LLM judgment, and retrieval runs named hybrid-search recipes.

## When to use
Building memory layers that must answer point-in-time queries, ingest evolving facts without deleting history, or run entity/edge resolution at scale.

## Key skill-lines
- Facts that change -> bi-temporal edges: valid_at / invalid_at / expired_at / reference_time (`references/bitemporal.md` §1).
- Contradictions -> temporal-overlap arithmetic sets invalid_at + expired_at; LLM used only to EXTRACT timestamps, small model, reference-anchored (`references/bitemporal.md` §3).
- Resolution pipeline -> exact-dedup fast path, duplicate-vs-invalidation candidate separation, Redis dedup-cache override merging for cache/index lag (`references/bitemporal.md` §2).
- Retrieval -> named search-config recipes (RRF hybrid / node-distance / cross-encoder) behind one GraphDriver interface across Neo4j/FalkorDB/Neptune/Kuzu.

## Capsule map

### Bi-temporal facts
- valid_at/invalid_at/expired_at edges, arithmetic contradiction invalidation — `references/bitemporal.md`.
### Retrieval & nodes
- Named hybrid-search recipes behind one GraphDriver across Neo4j/FalkorDB/Neptune/Kuzu — `references/search.md`, `references/nodes.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`graphiti`** (`/mnt/hdd/utopia/inspo/graphiti`). 4,157 nodes / 20,368 edges; packages: driver (861), utils (359), llm_client (250), search, namespaces, prompts.

- `codebase_memory_get_architecture({ project: "graphiti", aspects: ["overview", "entry_points", "hotspots"] })`
- `codebase_memory_search_graph({ project: "graphiti", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "graphiti", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/bitemporal.md` — the four-clock edge model, resolution pipeline, contradiction arithmetic.
- `references/search.md` — hybrid composition, five rerankers, fail-closed fulltext construction, filter scaffolding, cost-tier recipes.
- `references/nodes.md` — extraction batching, three-tier dedup with defensive LLM guardrails, summary flights, node taxonomy traps.

## Skill Result Contract

```xml
<skill_result>
  <skill>graphiti-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Point-in-time lies, self-invalidating duplicates, unbounded graph growth, or none</risks>
</skill_result>
```