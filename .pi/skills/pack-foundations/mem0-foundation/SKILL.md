---
name: mem0-foundation
description: "Use when building agent memory: memory add/extract/update/delete, scoped retrieval with metadata filters and reranking, vector-store backends, and SQLite history."
disable-model-invocation: true
---
---
name: mem0-foundation
description: "Use when building agent memory: memory add/extract/update/delete, scoped retrieval with metadata filters and reranking, vector-store backends, and SQLite history."
disable-model-invocation: true
---

# Mem0 Foundation

## Solves
The reference agent memory layer: an LLM extracts facts from messages into memories, stores them in a vector store, retrieves them scoped by user/agent/run. Sharpest parts: the add pipeline and the search filter language.

## When to use
Building agent memory.

## Key skill-lines
- Agent memory -> port the add/search pipeline: LLM extract + add/update/delete decision on write; scoped retrieval with metadata filters + threshold + optional rerank on read.
- Memory scoping -> user_id/agent_id/run_id in filters (never top-level on search).
- Metadata filtering -> the filter language: eq/ne/in/nin/gt/gte/lt/lte/contains/icontains/wildcard + AND/OR/NOT.
- Memory history -> SQLiteManager: history + messages tables, batch add, per-memory history.
- Vector store -> the common interface over 30+ backends; swap by config.

## Full view (memory graph)

Indexed in Codebase Memory as **`mem0`** (`/mnt/hdd/utopia/inspo/mem0`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "mem0", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "mem0", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "mem0", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "mem0", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — storage layer, vector-store + reranker surface, red flags, verification.
- `references/pipeline.md` — the V3 phased add pipeline (six phases, corrections vs older write-ups).
- `references/scoping.md` — identity-stripping metadata templates, deliberate add-vs-search API asymmetry, escaped scope keys.
- `references/search.md` — reject-don't-default validation, the operator filter language, per-backend normalization.

## Skill Result Contract

```xml
<skill_result>
  <skill>mem0-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Memory pattern ported, provenance cited, verified</evidence>
  <artifacts>Add/search pipeline + store + filters</artifacts>
  <risks>Scope leak, unfiltered retrieval, broken events, or none</risks>
</skill_result>
```
