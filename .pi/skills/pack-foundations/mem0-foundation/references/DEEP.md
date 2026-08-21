# Mem0 Foundation — Deep Reference


# Mem0 Foundation

A deep reference for mem0. Apache-2.0. Branch `main`, commit 001c235 (2026-08-14). Root: `/mnt/hdd/utopia/inspo/mem0`. Graph: 16822 nodes / 64103 edges. The reference **agent memory layer**: an LLM extracts facts from messages into memories, stores them in a vector store, and retrieves them scoped by user/agent/run. The sharpest parts: the **add pipeline** (extract -> decide add/update/delete) and the **search filter language**.

## Architecture

```
mem0/memory/base.py        -> MemoryBase ABC: get/get_all/update/delete (the minimal contract)
mem0/memory/main.py        -> Memory(MemoryBase): add, search, get_all, update, delete, delete_all, reset (sync + async)
mem0/memory/storage.py     -> SQLiteManager: history + messages tables (add_history, get_history, save_messages, get_last_messages)
mem0/memory/telemetry.py   -> capture_client_event
mem0/vector_stores/        -> 30+ backends: qdrant, pinecone, weaviate, chroma, pgvector, supabase, redis, milvus, elasticsearch, faiss, mongodb, cassandra, ...
mem0/reranker/             -> llm, cohere, sentence_transformer, zero_entropy, huggingface (rerank search results)
mem0/configs/              -> per-vector-store config
mem0/proxy/                -> hosted proxy (main.py)
cli/node/                  -> a Node CLI (backend/base, agent-mode, agent-rush, config, entities, events)
```

Hotspots (graph): BaseProject.get (105), logger.error (108), logger.info (99), MemoryBase.get (74), capture_client_event (68).

## Primitive 1: the add pipeline (Memory.add)

`add(messages, *, user_id, agent_id, run_id, metadata, timestamp, expiration_date, infer=True, memory_type, prompt)`:
- **Scoping**: one of user_id/agent_id/run_id is REQUIRED. `_build_filters_and_metadata` merges them into effective filters + metadata.
- **infer=True** (default): an LLM extracts key facts and decides whether to **ADD, UPDATE, or DELETE** related memories. `infer=False`: messages stored as raw memories.
- **memory_type**: only `MemoryType.PROCEDURAL.value` ("procedural_memory") is accepted (requires agent_id); anything else raises Mem0ValidationError.
- **expiration_date**: YYYY-MM-DD; expired memories hidden from search/get_all unless show_expired.
- **Validation**: messages must be str / dict / list[dict]; normalized. Raises Mem0ValidationError (with error_code + suggestion), VectorStoreError, EmbeddingError, LLMError, DatabaseError.
- Returns `{"results": [{"id", "memory", "event": "ADD"}]}`.
- **Result events**: ADD / UPDATE / DELETE — the LLM's decision surfaces in the response.

**The lesson: memory write = LLM extraction + add/update/delete decision + typed validation errors + scope filters.**

## Primitive 2: the search flow (Memory.search)

`search(query, *, top_k=20, filters, threshold=0.1, rerank=False, explain=False, ...)`:
- **filters is REQUIRED and must contain at least one of user_id/agent_id/run_id** — top-level entity args are rejected (`_reject_top_level_entity_params`).
- **The metadata filter language** (the sharpest part):
  - exact: `{"key": "value"}`
  - operators: eq, ne, in, nin, gt, gte, lt, lte, contains, icontains
  - wildcard: `{"key": "*"}`
  - logic: AND / OR / NOT over nested filters
- **threshold** (default 0.1): minimum score.
- **rerank** (default False): rerank via the reranker (llm/cohere/sentence_transformer).
- **explain**: include score_details per result.
- Returns `{"results": [{"id", "memory", "score", ...}]}`.

**The lesson: retrieval = vector search scoped by entity ids + a rich metadata filter language + optional rerank + a score threshold.**

## Primitive 3: the storage layer (memory/storage.py)

`SQLiteManager(db_path=":memory:")`:
- `_create_history_table` / `_create_messages_table` + `_migrate_history_table` — schema + migration.
- `add_history` / `batch_add_history` / `get_history(memory_id)` — per-memory history.
- `save_messages(messages, session_scope)` / `get_last_messages(session_scope, limit=10)` — recent-session messages.
- `reset()` / `close()`.

## Primitive 4: the vector-store + reranker surface

- 30+ vector stores behind a common interface: qdrant, pinecone, weaviate, chroma, pgvector, supabase, redis, milvus, elasticsearch, faiss, mongodb, cassandra, opensearch, valkey, upstash, s3_vectors, ...
- Rerankers: llm_reranker, cohere_reranker, sentence_transformer_reranker, zero_entropy_reranker, huggingface_reranker — all behind `reranker/base.py`.
- Configs are per-store under `mem0/configs/vector_stores/`.

## How to use

- **When you need agent memory** -> port the add/search pipeline: LLM extract + add/update/delete decision on write; scoped retrieval with metadata filters + threshold + optional rerank on read.
- **When you need memory scoping** -> user_id/agent_id/run_id in filters (never top-level on search).
- **When you need metadata filtering** -> the filter language: eq/ne/in/nin/gt/gte/lt/lte/contains/icontains/wildcard + AND/OR/NOT.
- **When you need a memory history** -> SQLiteManager: history + messages tables, batch add, per-memory history.
- **When you need a vector store** -> the common interface over 30+ backends; swap qdrant/pgvector/chroma by config.
- **When you need better retrieval** -> rerank=True with an llm/cohere/sentence-transformer reranker.

## Red Flags

- search() with top-level user_id/agent_id/run_id (rejected — must use filters).
- A filter with no entity id (raises).
- infer=False when you want the LLM's add/update/delete decision.
- A memory_type other than procedural_memory (raises Mem0ValidationError).
- Ignoring the event (ADD/UPDATE/DELETE) in the add result.
- Non-validated entity ids (must trim/validate).

## Verification

- add returns ADD/UPDATE/DELETE events; scoped memories land under the right filters.
- search returns only memories matching the filter + threshold.
- Metadata operators (gt/gte/in/contains/AND/OR/NOT) actually filter.
- Expired memories are hidden unless show_expired.
- History persists per memory; recent messages retrieve by session scope.

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
