---
name: graphrag-foundation
description: "Use when building knowledge-graph RAG: Map-Reduce global search over community reports, vector-seeded local mixed context, DRIFT expand-and-specialize querying, and monorepo storage/llm abstraction splits."
disable-model-invocation: true
---
# GraphRAG Foundation

## Solves
How Microsoft's GraphRAG answers corpus-wide vs entity-specific vs unknown-scope questions over a pre-built knowledge graph: three search modes (global Map-Reduce, local vector-seeded mixed context, DRIFT expand-and-specialize) over community-report hierarchies.

## When to use
Building RAG over knowledge graphs, hierarchical summarization pipelines, or multi-mode query systems that route by question scope.

## Key skill-lines
- Corpus-wide questions -> GlobalSearch Map-Reduce: concurrent JSON-point map over community chunks (semaphore 32), single reduce, separate model tiers per phase (`references/search-modes.md`).
- Entity questions -> LocalSearchMixedContext: vector-match query to entities, rate-based outward composition of reports/relationships/covariates/text-units under max_context_tokens (`references/search-modes.md`).
- Unknown scope -> DRIFT: prime globally to generate follow-up questions, execute each as a local search sharing QueryState (`references/search-modes.md`).
- Architecture -> monorepo interface split: graphrag-llm/storage/vectors/cache/chunking packages behind factories; prompt_tune generates domain extraction prompts.

## Full view (memory graph)

Indexed in Codebase Memory as **`graphrag`** (`/mnt/hdd/utopia/inspo/graphrag`). 5,367 nodes / 24,019 edges; 574 Python files; monorepo packages graphrag/graphrag-llm/graphrag-storage/graphrag-vectors/graphrag-cache.

- `codebase_memory_get_architecture({ project: "graphrag", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "graphrag", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "graphrag", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/search-modes.md` — global Map-Reduce and DRIFT expand-and-specialize with anchors and cost tiers.
- `references/local-search.md` — the LocalSearchMixedContext builder: vector-seeded entity mapping, rank-weighted relationship inclusion, and source context citation.
- `references/architecture.md` — the monorepo package split behind factories (graphrag-llm/storage/vectors/cache/chunking).

## Unmined subsystems

- Indexing verbs pipeline (`index/operations/`) — extract/summarize/cluster flows.
- Community detection (`graphs/modularity.py`) — Leiden/modularity clustering.
- prompt_tune domain-adaptive prompt generation.

## Skill Result Contract

```xml
<skill_result>
  <skill>graphrag-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Context overflow on reduce, wrong-scope routing, unpruned DRIFT fan-out, or none</risks>
</skill_result>
```