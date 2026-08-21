# Mem0 — Add/Search Pipeline Reference

Source-grounded reference for `mem0/memory/main.py` (3,856 lines; sync+async twins). Ranges read in full: `_build_filters_and_metadata` :314-420, `add` :760-880, `_add_to_vector_store` :881-1050, `search` :3031-3130.

Verification surface: `mem0/configs/base.py` holds the config chain, `mem0/memory/base.py` the MemoryBase interface, `mem0/memory/storage.py` the history storage, and `mem0/vector_stores/filters.py`-family files the per-backend translation. Tests pin the phased flow in `tests/memory/`.

**Correction to older write-ups:** the shipped pipeline is the **V3 PHASED BATCH PIPELINE** — ADDITIVE extraction in one LLM call, not the classic per-fact ADD/UPDATE/DELETE decision loop.

## WHAT: scoping is enforced twice, asymmetrically

`_build_filters_and_metadata` (:314-420) returns TWO dicts:

- `base_metadata_template` — what gets STORED. Identity keys (`user_id`/`agent_id`/`run_id`) are set ONLY from entity params; the same keys are STRIPPED from caller-supplied metadata first (issue #6655: freeform metadata could otherwise place a memory into a scope the caller never passed — re-pinning after the fact can't prevent it for unset params).
- `effective_query_filters` — what gets QUERIED. Adds the resolved actor: precedence explicit `actor_id` arg → `filters["actor_id"]`; used for querying but NOT stored (the storage actor comes from message content later).

At least one session id REQUIRED everywhere; missing → `Mem0ValidationError(VALIDATION_001)`.

**API asymmetry is deliberate**: `add()` takes top-level user_id/agent_id/run_id; `search()`/`get_all()` REJECT top-level entity params (raise) and require the `filters=` dict form — so grep-auditable call sites can't accidentally search unscoped.

Session scope keys build deterministically (`_build_session_scope`) as sorted-key `k=v` pairs joined by `&`, with structural delimiters ESCAPED (`%`→`%25`, `&`→`%26`, `=`→`%3D`) so an id containing `&` cannot forge scope boundaries in the SQLite history key.

## WHERE: the six phases of add (:881-1050)

`infer=False` short-circuit: raw messages embedded verbatim (system roles skipped, role/actor_id into per-message metadata).

Otherwise:

0. **Context**: deterministic `session_scope` → last 10 messages from SQLite history (`db.get_last_messages`).
1. **Existing retrieval**: embed parsed messages, vector-search top_k=10 scoped to session-id filters only.
2. **Single LLM extraction** with **anti-hallucination id mapping**: real UUIDs are replaced by indices `"0".."9"` before entering the prompt (`uuid_mapping`), so the model can only REFERENCE retrieved memories, never invent ids. Prompt is `ADDITIVE_EXTRACTION_PROMPT` (+ agent-context suffix when agent-scoped). Response parsed leniently (code-block strip → strict=False → regex JSON extract). On LLM failure it now RAISES `LLMError` — the comment records why: a silent `return []` made "provider 429" indistinguishable from "nothing to learn", breaking upstream retry/fallback.
3. **Batch embed** all extracted texts; per-item fallback on batch failure.
4. **Dedup**: md5(text) against existing hashes AND within-batch `seen_hashes`. Text lemmatized into a separate `text_lemmatized` payload field (BM25 index support). created_at/updated_at stamped UTC.
6. **Batch persist** vectors+payloads; raw messages saved to history even when nothing was extracted.

Procedural memories are a special case (`memory_type="procedural_memory"` only; anything else rejected with VALIDATION_002) requiring agent_id.

Expiration dates are normalized at add time; expired memories are HIDDEN from search/get_all unless `show_expired=True`.

## WHY search validates so hard (:3031+)

- top-level entity kwargs rejected (`_reject_top_level_entity_params`); threshold/top_k validated BEFORE defaults applied.
- Entity ids inside filters validated/trimmed individually.
- **Filter operator language** (documented in the signature): exact match, `{eq,ne,in,nin,gt,gte,lt,lte,contains,icontains}`, `"*"` wildcard, plus logical `AND`/`OR`/`NOT` lists. Advanced operators are detected and pre-processed (`_process_metadata_filters`); operator keys are then REMOVED from the flat dict passed down to stores that don't understand them.
- `explain=True` returns score_details per result; `rerank=True` invokes the optional reranker after vector retrieval; default `threshold=0.1` filters noise.

**The lessons: memory writes need (a) identity scope that freeform metadata cannot override, (b) LLM-facing integer ids over real keys, (c) loud failure on extraction errors, (d) hash dedup across AND within batches, and (e) an escaped deterministic scope key wherever a store flattens structured scopes into strings. Search needs reject-don't-default scoping plus an operator language normalized per backend.**
