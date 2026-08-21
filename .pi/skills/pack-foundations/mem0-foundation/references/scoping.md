# Mem0 — Scoping Reference

(Read in full during the deep pass.) Files: `mem0/memory/main.py` ranges cited inline, with the sibling history layer in `mem0/memory/storage.py` (`get_last_messages`), scope-key helpers `_build_session_scope`/`_escape_scope_value` in `mem0/memory/main.py`.

Source-grounded reference for identity scoping in the memory layer. File: `mem0/memory/main.py` (`_build_filters_and_metadata` :314-420, `_build_session_scope`, `_escape_scope_value`, read in full during the deep pass).

## Identity scope is re-built, never trusted

`_build_filters_and_metadata` returns TWO dicts:

- **base_metadata_template** (what gets STORED): identity keys (`user_id`/`agent_id`/`run_id`) are set ONLY from entity params. The same keys are STRIPPED from caller-supplied metadata first — issue #6655 records why: freeform metadata could otherwise place a memory into a scope the caller never passed, and "re-pinning after the fact" cannot prevent it for params left unset.
- **effective_query_filters** (what gets QUERIED): adds the resolved actor — precedence explicit `actor_id` arg → `filters["actor_id"]` — but the actor is NOT stored from here; the storage actor derives from message content later.

At least one session id is REQUIRED everywhere; missing → `Mem0ValidationError(VALIDATION_001)`.

## The asymmetry is deliberate

`add()` takes top-level `user_id`/`agent_id`/`run_id`; `search()`/`get_all()` REJECT top-level entity params (raise) and require the `filters=` dict form. Rationale in the docstring: grep-auditable call sites can't accidentally search unscoped. Write paths stay ergonomic; read paths stay auditable.

## Scope keys are escaped, deterministically

`_build_session_scope` builds the SQLite history key as sorted-key `k=v` pairs joined by `&`, with structural delimiters escaped per `_escape_scope_value` (`%`→`%25`, `&`→`%26`, `=`→`%3D`). An id containing `&` therefore cannot forge scope boundaries in the flattened history key.

**Lesson:** scope enforcement lives at a single chokepoint that strips identity from caller metadata, re-pins from entity params, escapes delimiters, and forces the read side through an auditable filter form.

## Verification

Issue-tracking anchors: #6655 (freeform metadata placing memories in unrequested scopes) motivates the strip-then-repin order; VALIDATION_001 enforces the at-least-one-id invariant; the escape table in `_escape_scope_value` (`mem0/memory/main.py`) is unit-pinned by scope-key round-trip tests. The add-vs-search asymmetry is enforced by `_reject_top_level_entity_params` raising on the read path.
