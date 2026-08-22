---
name: graphrag-foundation
description: "Use when building knowledge-graph RAG: Map-Reduce global search over community reports, vector-seeded local mixed context, DRIFT expand-and-specialize querying, and monorepo storage/llm abstraction splits."
disable-model-invocation: true
---
# GraphRAG Foundation

## Use this for
Knowledge-graph RAG: Map-Reduce global search over community reports, vector-seeded local mixed context with citations, and DRIFT expand-and-specialize querying — split across a monorepo model/storage/searches abstraction. Source and direct tests are ground truth; references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/search-modes.md` — global Map-Reduce, local mixed, DRIFT expand-and-specialize with anchors and reuse tiers.
- `references/local-search.md` — the LocalSearchMixedContext builder: vector-seeded entity mapping, selected relationships, and source citation.
- `references/architecture.md` — the monorepo package split behind factories.

## Capsule map
- **Search modes** — `references/search-modes.md`, `references/local-search.md`: Map-Reduce local global + vector-seeded mixed context + DRIFT.
- **Monorepo seam** — `references/architecture.md`: llm/storage/vectors/cache factory split.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `graphrag` (`/mnt/hdd/utopia/inspo/graphrag`); 5,367 nodes / 24,019 edges. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the search-mode contracts and factory split; adapt storage vectors caches and llm providers; omit full-pipeline build orchestration unless a target requires it.
