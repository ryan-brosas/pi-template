# Pydantic-AI-Harness — Spend Reference

Source-grounded reference for the spend package. File: `pydantic_ai_harness/spend/_budget.py` (265 lines, read in full), with the redis store in `_redis.py` and capability glue in `_capability.py`.

## A window produces a key; nobody resets counters

The module opens with the design in one sentence: "A window decides the key a budget counts against and nothing else — a new day is a new key." Rollover equals key change; there are no reset jobs.

`store_key = name | window | scope | bucket` with three details each carrying a comment:

- Separator is `|` NOT `:` — colons appear inside model references and tenant ids.
- WINDOW IS PART OF THE KEY even though buckets look disjoint: a run whose id happens to be `total` would otherwise share a counter with a `total` budget.
- Only the first three separators delimit; name/window/scope are validated separator-free, so the bucket needs no check even though consumer-supplied ids may contain anything.

## The TTL compromise table

Time windows may expire freely (the bucket already rolled over). `run`/`conversation` never roll over, so expiry there would hand back the ceiling — but per-conversation keys grow the store unbounded. The shipped horizons: run 24h, conversation 30d, day 48h, month 62d, total None — "long enough that a conversation reaching it cannot practically be resumed."

## Validation as recorded failures

`__post_init__` rejects configs that "would quietly misbehave":

- Ceiling ≤ 0 → exhausted-before-start, indistinguishable from real overspend; `usd: 0` in specs usually MEANS "no limit", which `None` says outright.
- NaN caught via `usd.is_finite()` BEFORE the `<= 0` comparison (which would raise InvalidOperation); infinity passes the comparison but reads as an unreachable ceiling — `usd=None` already says that.
- `warn_at` without a ceiling can never fire → error, not silent no-op; a misspelt `'forevr'` retain literal is rejected AT CONSTRUCTION rather than failing at the store's first write.
- Scope callables are checked for output type, NOT coerced: `str()` on an int-typed tenant id would mint a fresh counter per run (repr carries a memory address); returning the reserved `'*'` scope or containing `|` is refused with reasons spelled out.

Also shipped: pure-counter budgets (no usd/tokens) accumulate and report but never block — per-tenant accounting with no cap (`pydantic_ai_harness/spend/_capability.py` wires `SpendLimits` status reporting); `BudgetSpec` is a TypedDict because callables have no JSON schema (core strips callables from union tops but not nested dataclass fields).

**Lesson:** budgets-as-keys beat reset jobs; validate config against its failure mode at construction; type-check caller-supplied outputs, never coerce them.

## Verification

`tests/spend/test_spend.py` (1,479 lines) pins key composition, TTL behavior, validation failure modes, and scope resolution.
