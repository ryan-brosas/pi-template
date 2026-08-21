# GraphRAG — Architecture Reference

Source-grounded reference for the 2025 monorepo rewrite. Packages: `graphrag/`, `graphrag-llm/`, `graphrag-storage/`, `graphrag-vectors/`, `graphrag-cache/`, `graphrag-chunking/`, `graphrag-input/`.

## The split: interfaces first, providers second

GraphRAG was split from one Python package into a graph of capability interfaces. The core depends only on abstract seams:

- **graphrag-llm** — model/embedding/tokenizer abstractions wrapped in `graphrag-llm/` with `gather_completion_response_async` for fan-out and `CompletionMessagesBuilder` for shared message assembly. Search modes consume `LLMCompletion`/`LLMEmbedding`; index operations swap tiny local models for large cloud ones without touching the pipeline.
- **graphrag-storage** — persist every stage (documents, text units, entities, relationships, community reports) behind versions of insert/upsert/read contracts, so Parquet/JSON/BLOB backends are interchangeable.
- **graphrag-vectors** — the shared VectorStore abstraction used by local search entity mapping.
- **graphrag-cache** — `json_cache.py`, `memory_cache.py`, `noop_cache.py` behind `factory.py`, so indexing can be *replayed* (cache hits skip re-extraction) or made cheap in CI.
- **graphrag-chunking** / **graphrag-input** — document splitting and input adapters isolating the format layer.

**Progressive disclosure of the config**: `graphrag/config/models/graph_rag_config.py` plus `defaults.py` centralize runtime knobs; `prompt_tune/` builds adapter prompts that tune entity/relationship extraction vocabulary to a target dataset, writes them to `settings.yaml`.

**Lesson:** split a data pipeline into capability seams BEFORE feature depth (cache/storage/vector/llm); the pipeline then reads as a dependency graph, and backend swaps/tuning stay local.

## Index pipeline shape

`index/operations/` holds named operations each with `run` + strategy subpackages: extract, summarize (text units → community reports), cluster (community detection via `graphs/modularity.py`), claim extraction (covariates). Deterministic storage ids (integer/uuids) let the pipeline resume any step. The operations write raw tables + parquet artifacts into `output/`, which query then loads.

## Verification

Configuration schemas and pipeline invariants are smoke-tested via `tests/` (smoke/integration), and `graphrag-cache` behaves identically beneath disk-backed tests since persistence of intermediate artifacts is what enables re-runs.
