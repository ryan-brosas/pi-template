# Pydantic-AI-Harness — Compaction Reference

Source-grounded reference for the compaction package. Files: `pydantic_ai_harness/compaction/_sliding_window_compaction.py` (252 lines, read in full), `_context_window.py` (72 lines, full), `_pinning.py` (90 lines, full), with the package `__init__` export surface.

## Window resolution: fractions over constants

The module docstring states the philosophy: every strategy triggers on an absolute token budget, but "that constant is wrong for every model it was not measured against." So `resolve_context_window(model)` looks the REAL window up in `genai-prices` (already a transitive dependency) and strategies accept a FRACTION of it.

- `None` is returned both for unlisted models AND entries without a recorded window, so callers can't mistake unknown for a number; zero/negative registry values are treated as absent rather than propagating impossible budgets.
- `DEFAULT_CONTEXT_WINDOW = 200_000` is deliberately conservative: "compacting earlier than necessary costs one summary; overestimating the window costs the whole request."
- Three override levels per strategy: `context_window` (applies always — for confident-overrides), `fallback_context_window` (applies only when resolution FAILS — local endpoints, Bedrock prefixes), else the resolved value.
- `FallbackModel` reports a composite `fallback:...` id matching no registry entry → resolves to None by design. The module names itself as the SINGLE switch point for when pydantic-ai core grows a native field (upstream issue #4538 referenced).

**Lesson:** treat context windows as measured data with a named fallback ladder — never let one constant silently under- or over- estimate a fleet of models.

## SlidingWindowCompaction mechanics

Triggers are mutually exclusive by validation (`max_messages` / `max_tokens` / `max_fraction`; `max_fraction` resolves PER REQUEST so one setting behaves correctly on any model). Trimming runs in `before_model_request`, transparent to the rest of the run.

- Cutoffs are TOOL-PAIR-SAFE (`find_safe_cutoff` / `find_token_cutoff` from `_shared.py`) — never orphan a tool call from its result.
- `preserve_first_user_message=True` re-prepends the first UserPromptPart after trimming (task context survives); pinned messages (`pin`/`is_pinned`/`reinject_pinned` in `_pinning.py`) re-inject after any trim.
- **Receipts** (opt-in): a deterministic compaction receipt prepends what was dropped (messages, tokens, transcript handle). Two subtleties: the receipt's OWN tokens are RESERVED from the keep-budget before computing the cutoff; prior receipt-only requests are stripped before inserting the new one, and dropped messages are detected by IDENTITY (`is` comparison), never equality.

The wider kit: `ClampOversizedMessages`, `ClearToolResults`, `DeduplicateFileReads`, `TieredCompaction` (sliding→summarizing escalation), `SummarizingCompaction`, `WarnNearLimits`, `ReportContextUsage`, `compact_now` (manual), all sharing `_shared.py`'s pair-safe cutoffs. Renamed classes get deprecation shims via module `__getattr__`.

**Lesson:** compaction needs pair-safe cutoffs, pin-honoring, and receipt bookkeeping that reserves its own token cost before trimming.

## Verification

`tests/compaction/test_compaction.py` (3,723 lines) and `test_context_budget.py` (1,455 lines) pin window resolution, mutual-exclusion triggers, pair-safe cutoffs, pin survival, and receipt emission.
