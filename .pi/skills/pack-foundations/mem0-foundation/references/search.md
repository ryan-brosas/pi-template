# Mem0 — Search Validation Reference

(Read in full during the deep pass.) Files: `mem0/memory/main.py`, validation helpers `_validate_search_params` and `_validate_and_trim_search_query` in `mem0/memory/main.py`, plus `mem0/vector_stores/filters.py`-family for operator translation.

Source-grounded reference for the read side. File: `mem0/memory/main.py` (`search` :3031-3130, `_reject_top_level_entity_params`, `_has_advanced_operators`, `_process_metadata_filters`, read in full during the deep pass).

## Reject-don't-default validation

- Top-level entity kwargs are REJECTED (`_reject_top_level_entity_params`) — the `filters=` dict is mandatory.
- `threshold` and `top_k` are validated BEFORE defaults are applied, so invalid explicit values can't hide behind defaults.
- Entity ids inside filters are individually validated and trimmed.

## The operator filter language

From the signature docstring: exact match `{"key": "value"}`, plus `eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains`, `icontains`, `"*"` wildcard, and logical `AND` / `OR` / `NOT` lists. Detection (`_has_advanced_operators`) precedes processing (`_process_metadata_filters`), after which operator keys are REMOVED from the flat dict passed down to stores that don't understand them — the language is normalized per backend at one boundary.

Lifecycle extras: `explain=True` returns per-result score_details; `rerank=True` invokes the optional reranker after vector retrieval; default `threshold=0.1` filters noise; expired memories hide unless `show_expired=True`.

**Lesson:** search surfaces need reject-not-default validation, a documented operator language, and one normalization point per backend — never push raw operator dicts into stores.

## Verification

The operator language is exercised by per-backend suites (a filters test per store backend in `mem0/vector_stores/`); `_has_advanced_operators` / `_process_metadata_filters` round-trips are unit-tested for exact-match plus nested AND/OR composition; threshold/top_k validation-before-defaults is pinned by `_validate_search_params` callers. Per-backend normalization mostly translates to provider query builders (pgvector/Qdrant/etc). Extra: `mem0/configs/enums.py` lists MemoryType for the procedural gate.
