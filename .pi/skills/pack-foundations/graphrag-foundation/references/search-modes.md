# GraphRAG — Search Modes Reference

Complete source-grounded reference for the three query modes. Files: `packages/graphrag/graphrag/query/structured_search/{global_search/search.py` (521 lines), `drift_search/search.py` (464 lines), `local_search/mixed_context.py` (493 lines)} — heads and key regions read.

## Global search: Map-Reduce over pre-built community reports

**WHO** — questions about the WHOLE corpus ("what are the main themes?"). **WHAT** — `GlobalSearch` (:66-130) splits context chunks across concurrent LLM calls (map, semaphore-bounded at `concurrent_coroutines=32`, default), each producing a JSON `points` list scored by importance, then a REDUCE call merges points into the final answer within `max_data_tokens=8000`.

**WHY** — community reports are already summaries; no single context window can hold them all for corpus-wide questions. Map-Reduce parallelizes comprehension; `json_mode` on map calls makes points parseable (`response_format_json_object: True`), and a NO_DATA_ANSWER sentinel handles empty batches honestly.

**HOW** — `stream_search` gathers `_map_response_single_batch` per chunk via asyncio.gather, streams the reduce phase token-by-token. Map/reduce have SEPARATE llm params and max lengths (1000/2000) — cheap model for bulk comprehension, better model for synthesis. General-knowledge mode appends an instruction letting the LLM answer from prior knowledge when context is insufficient.

**Lesson:** corpus-wide questions need hierarchical summarization — map cheaply in parallel over pre-summarized chunks, reduce once, and let map/reuse use different model tiers.

## Local search: vector-seeded mixed context with rate-based budgets

**WHO** — questions about SPECIFIC entities ("who is Alice?"). **WHAT** — `LocalSearchMixedContext` maps the query to entities via vector store (keyed by id or name), then composes context from community reports + relationships + covariates + text units around those entities (:36-80 constructor takes all tables as dicts keyed by id).

**HOW** — context is built by rate-based inclusion: each contributor (entity description, relationships weighted by rank×weight, community reports, text units) consumes tokens from `max_context_tokens` until exhausted, with `include_entity_rank` boosting important entities. Conversation history integrates so follow-ups re-map to entities.

**Lesson:** entity-centric retrieval = vector-match query→entities, then walk OUTWARD through precomputed relationship/community structures under a token budget — never raw graph traversal at query time.

## DRIFT search: primer → follow-up questions → local searches

**WHO** — broad questions needing BOTH global awareness AND local grounding. **WHAT** — DRIFT (Dynamic Reasoning and Inference-based Follow-up Tracking) primes with a global-style pass generating FOLLOW-UP QUESTIONS conditioned on community reports, then executes each follow-up as a LOCAL search (DriftAction), carrying shared QueryState across branches (:46-110).

**WHY** — global search answers themes but misses specifics; local search finds specifics but misses scope. DRIFT expands one broad query into k grounded sub-queries, runs them concurrently (tqdm_asyncio), and merges. The primer owns its own LocalSearch instance configured FROM the DRIFT config (local_search_* params mirrored :96-115).

**Lesson:** when question scope is unknown, expand-then-specialize: use cheap global structure to GENERATE concrete sub-questions, execute them with local precision, share state so duplicate work collapses.

## Architecture: monorepo package split

The 2025 rewrite split the monolith into `graphrag-llm` (LLM/embedding/tokenizer abstractions), `graphrag-storage` (table/blob backends), `graphrag-vectors`, `graphrag-cache` (json/memory/noop + factory), `graphrag-chunking`, `graphrag-input` — the core package depends only on their interfaces. Prompt tuning (`prompt_tune/`) generates domain-specific extraction prompts per dataset.
