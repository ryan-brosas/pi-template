# Graphiti — Bi-Temporal Memory Reference

Source-grounded reference. Read IN FULL: `utils/maintenance/edge_operations.py` (`resolve_extracted_edges` :325-444, `resolve_edge_contradictions` :538-577, `_extract_edge_timestamps` :579-620), `edges.py` `EntityEdge` (:263-303), `graphiti.py` imports/orchestrator surface (:1-120, method map). Graph: 4,157 nodes / 20,368 edges.

## 1. The bi-temporal edge model

- **WHO** — agents whose facts CHANGE ("Alice is CEO" → later "Alice is ex-CEO").
- **WHAT** — every fact-edge carries FOUR timestamps (`edges.py:271-282`):
  - `valid_at` — when the fact became true IN THE WORLD (event time)
  - `invalid_at` — when it stopped being true (event time, may be inferred)
  - `expired_at` — when the GRAPH LEARNED it was invalidated (ingestion time)
  - `reference_time` — the producing episode's timestamp
- **WHY**: event time ≠ ingestion time. "Alice left in March" learned today must read as valid-until-March (invalid_at=March), NOT valid-until-today. Queries can then ask "what was true AT date D" — impossible with single-timestamp stores.

## 2. WHERE: the add-episode resolution pipeline

`add_episode` → extract nodes/edges → `resolve_extracted_edges` (`edge_operations.py:325+`):

1. **Exact-dedup fast path** on `(source, target, normalized fact)` before any I/O.
2. **Embeddings created first**, so all subsequent searches are hybrid.
3. Per-edge candidates gathered concurrently (`semaphore_gather`): DUPLICATE candidates = existing edges BETWEEN the same nodes; INVALIDATION candidates = graph-wide hybrid search (RRF config) for related facts.
4. **Candidate-set hygiene**: an edge appearing in both lists stays ONLY in duplicates (:424-435) — a duplicate must never invalidate itself.
5. **Redis dedup-cache overrides merge into candidate lists** (:368-382 comment): recently-resolved edges invisible to indexes still count — eventual-consistency between cache and graph acknowledged and handled.

## 3. WHY contradiction resolution is arithmetic, not an LLM call

`resolve_edge_contradictions` (:538-577) decides invalidation by pure TEMPORAL OVERLAP:

- Non-overlapping lifetimes → both edges COEXIST (the old fact was true then; the new one is true now).
- Overlapping + older valid_at → old edge gets `invalid_at = new.valid_at`, `expired_at = utc_now()` (preserving any prior expiry).

No LLM judges "contradiction" — the extraction prompt already captured event-time claims; arithmetic composes them. LLM calls appear only where time is missing: `_extract_edge_timestamps` (:579+) uses a SMALL-model call against the episode's reference time, skips when timestamps exist, and degrades to warnings on failure.

## 4. Supporting machinery worth porting

- Search recipes as NAMED CONFIGS (`EDGE_HYBRID_SEARCH_RRF`, `EDGE_HYBRID_SEARCH_NODE_DISTANCE`, `COMBINED_HYBRID_SEARCH_CROSS_ENCODER`) — callers pick intent, not parameters.
- Episode windowing (`EPISODE_WINDOW_LEN`) feeds recent context into extraction.
- Community detection, bulk ingest paths, and multi-driver support (Neo4j/FalkorDB/Neptune/Kuzu) behind one `GraphDriver` interface with per-driver `search_ops`.
- MCP server front end exposing `/search`, `/get-memory`, episode CRUD routes.

## The lessons
1. Memory that changes needs FOUR clocks: event-valid, event-invalid, ingestion-expiry, reference. Conflate them and point-in-time queries become lies.
2. Contradiction handling should be temporal ARITHMETIC wherever extraction already captured event times; spend LLM calls only on extracting time, not judging conflict.
3. Candidate generation must separate duplicates from invalidations, and cache-vs-index eventual consistency needs explicit override merging.
