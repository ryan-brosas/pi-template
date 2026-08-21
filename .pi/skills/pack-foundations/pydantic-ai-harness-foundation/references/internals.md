# Pydantic-AI-Harness — Compaction & Spend Internals

Source-grounded reference. Read IN FULL: `compaction/_context_window.py` (72), `compaction/_sliding_window_compaction.py` (252), `spend/_budget.py` (265), `planning/_store.py` protocol (:1-110). Plus the package `__init__` export surface.

## Window resolution: fractions over constants

The module docstring states the philosophy: every strategy triggers on an absolute token budget, but "that constant is wrong for every model it was not measured against." So `resolve_context_window(model)` looks up the REAL window via `genai-prices` (already a transitive dependency) and strategies accept a FRACTION instead.

- `None` means unknown — returned both for unlisted models AND entries without a window, so callers can't mistake unknown for a number. Zero or negative registry values are treated as absent rather than propagating a budget no request could fit under.
- `DEFAULT_CONTEXT_WINDOW = 200_000` is deliberately CONSERVATIVE: "compacting earlier than necessary costs one summary; overestimating the window costs the whole request."
- Three-override ladder per strategy: `context_window` (always applies — for registries that are confidently wrong), `fallback_context_window` (only when resolution fails — local endpoints, Bedrock prefixes), else resolved value.
- `FallbackModel` reports a composite `fallback:...` id matching no registry entry → resolves to None by design.
- The module names itself as the SINGLE switch point for when pydantic-ai core grows a native field (issue #4538 referenced).

## SlidingWindowCompaction: zero-cost trimming done carefully

Triggers are mutually exclusive by validation (`max_messages` / `max_tokens` / `max_fraction`; `max_fraction` resolves PER REQUEST from the request's model so one setting behaves on any model). Trimming happens in `before_model_request` — transparent to the rest of the run.

- Cutoffs are TOOL-PAIR-SAFE (`find_safe_cutoff`/`find_token_cutoff` from `_shared`) — never orphan a tool call from its return.
- `preserve_first_user_message=True` re-prepends the first UserPromptPart after trimming (task context survives).
- Pinned messages (`pin`/`is_pinned`/`reinject_pinned`) are re-injected after any trim.
- **Receipts** (opt-in): a deterministic compaction receipt prepends what was dropped (messages, tokens, transcript handle). Two subtleties worth porting: (1) the receipt's OWN tokens are RESERVED from the keep-budget before computing the cutoff; (2) prior receipt-only requests are stripped before inserting the new one, and dropped messages are detected by IDENTITY (`is` comparison against survivors), never by equality.

The wider kit: `ClampOversizedMessages`, `ClearToolResults`, `DeduplicateFileReads`, `TieredCompaction` (sliding→summarizing escalation), `SummarizingCompaction`, `WarnNearLimits`, `ReportContextUsage`, `compact_now` (manual), all sharing `_shared`'s pair-safe cutoffs. Renamed classes get deprecation shims via module `__getattr__`.

## Budget: windows produce keys, nobody resets counters

`spend/_budget.py` opens with the design: "A window decides the key a budget counts against and nothing else… A new day is a new key." Rollover = key change, no counter resets anywhere.

### Store keys (:240-265)

`store_key = name | window | scope | bucket`. Details that each carry a comment:

- Separator is `|` NOT `:` — colons appear inside model references and tenant ids.
- WINDOW IS PART OF THE KEY even though buckets look disjoint: a run whose id happens to be `total` would otherwise share a counter with a `total` budget.
- Only the FIRST three separators delimit; name/window/scope are validated separator-free, so bucket needs no check even though conversation ids may contain anything.

### TTL table (:40-52)

Time windows may expire freely (bucket already rolled over); `run`/`conversation` NEVER roll over, so expiry there would hand back the ceiling — but per-conversation keys grow the store unbounded. The compromise horizons: run 24h, conversation **30d**, day 48h, month 62d, total None — "long enough that a conversation reaching it cannot practically be resumed."

### Validation as recorded failures (`__post_init__`)

Every rejection cites the misbehavior it prevents:

- Ceiling ≤ 0 → exhausted-before-start, indistinguishable from real overspend; `usd: 0` usually MEANS "no limit", which `None` already says.
- NaN caught via `usd.is_finite()` BEFORE the `<= 0` comparison (which raises InvalidOperation); infinity passes but reads as unreachable ceiling — `usd=None` says that outright.
- `warn_at` without a ceiling can never fire → error, not silent no-op.
- `retain` is a runtime-unenforced Literal, so a misspelt `'forevr'` is rejected AT CONSTRUCTION — otherwise it reaches the store and fails at first recorded response.
- Scope callables are TYPE-CHECKED not coerced: `str()` on an int-typed tenant id would mint a fresh counter per run (repr carries a memory address); returning the reserved `'*'` scope or containing `|` is refused with the reason spelled out.

Also notable: pure-counter budgets (no usd/tokens) accumulate and report but never block — per-tenant accounting with no cap. `BudgetSpec` is a TypedDict because callables have no JSON schema (core strips callables from union tops but not nested dataclass fields).

## PlanStore: six methods, one documented trap

`PlanStore` Protocol (`planning/_store.py`): get_items/set_items/get_item/add_item/update_item/remove_item. Backends: InMemory, Sqlite, Postgres — all emitting identical events.

The trap is written into the docstring: `set_items` is BULK REPLACEMENT and does NOT emit events, so the `write_plan` tool is event-silent while granular tools (`add_task`, `update_task_status`) emit. Applications rendering off events must also read after a run or steer the model to granular tools. Duplicate ids raise ValueError (every reader resolves first-match, so a duplicate makes updates land randomly; SQL stores enforce via primary key). Table names validated against `[A-Za-z_][A-Za-z0-9_]{0,62}` before SQL interpolation.

**The lessons: budgets-as-keys beat reset jobs; validate config against its failure mode at construction; type-check caller-supplied callables' OUTPUTS; make event-emission asymmetries loud; and treat context windows as measured data with a named fallback ladder.**
