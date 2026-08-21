# Pi Fabric — Ledger, Bounds & Registry Internals

Source-grounded reference. Files read IN FULL: `src/agents/budget-ledger.ts` (210 lines), `src/compaction/bounds.ts` (102 lines), `src/compaction/threshold.ts`. Plus `src/schema/types.ts` evidence kinds and `src/actors/global-registry.ts` resolution.

## Budget ledger: best-effort by documented design

The module docstring states the model up front: mirrors ypi's `RLM_BUDGET`/`RLM_COST_FILE`; spans ONE PI PROCESS PER NODE of a recursion tree; the ledger path travels to descendants through `{ ...process.env }`.

### Lifecycle (:66-118)

Three env vars — `PI_FABRIC_BUDGET`, `PI_FABRIC_BUDGET_FILE`, `PI_FABRIC_BUDGET_ID`:

- `initBudgetLedger(budget)` — TREE ROOT ONLY (depth 0, when nothing inherited): mkdtemp under tmpdir, empty `cost.jsonl` created mode **0o600**, id = 16 hex chars.
- `clearOwnedBudgetEnv()` — called by the owning manager on close so a long-lived HOST process does not leak an active budget into a later, unrelated session. (The lifecycle detail every naive port forgets.)
- `activeBudgetState()` returns undefined unless file present AND budget finite AND > 0 (`parseFloatFinite` guards against garbage env).

### Write/read semantics (:120-175)

- **Append-after-completion**: each manager appends ONE line after its child settles. `O_APPEND` makes small single-line writes atomic across concurrent POSIX writers — sufficient precisely BECAUSE writes are one-per-settlement.
- **Tolerant reads**: malformed JSON lines are skipped, never abort (“a single bad entry must not abort the whole read”, matching ypi's rlm_cost parser). Missing file reads as zero.
- **Swallowed write failures**: a failed append must not break the agent run — runaway spend is still bounded by the RACE-FREE ceiling: the per-execution call count (`agents.maxPerExecution`). The ledger is explicitly the BEST-EFFORT layer; concurrent children can each pass the check before any cost lands, so slight overshoot is accepted by design.
- `readBudgetLedgerDetailed` adds byRunner/byActor rollups; the entry parser accepts legacy flat rows while validating optional attribution fields.

**The lesson: two budget mechanisms with different guarantees — a cross-process approximate ledger for orchestration decisions, plus a race-free in-process ceiling as the actual backstop. Never make the shared-file layer load-bearing for correctness.**

## Compaction bounds: bytes, code points, provenance

`clipUtf8(text, maxBytes, suffix="…")`: iterates CODE POINTS (`for (const character of text)`) accumulating `utf8Bytes` per char — never splits multibyte sequences; reserves the suffix budget FIRST; `maxBytes<=0` → empty.

`canonicalizeText(input, maxBytes=8KB)`: whitespace-collapse → clip → returns `{text, truncated, sourceBytes}` — the ORIGINAL size survives truncation, so downstream UI can say “showing 8KB of 41KB” instead of lying by omission.

Constants: summaries capped at 32KB, request sources at 8KB.

### Sampling that keeps addresses (:44-88)

`sampleAddressedFrom(source, maxValues)` slides a keep-earliest(ceil)+keep-latest(floor) window over any iterable, counting omitted items AND recording the FIRST and LAST displaced `entryId`s. `omissionLine(count, first, last, noun)` renders `… omitted N entries; source entries X → Y`.

**The lesson: never summarize a range without leaving its ADDRESS — sampled output must name what was dropped (entry-id range) so a consumer can fetch the gap instead of trusting the summary.**

Per-model thresholds (`threshold.ts`): config keys are `provider/id` strings; a TOKEN threshold takes precedence over a ratio for the same model — the settings UI keeps the maps mutually exclusive and hand-written configs resolve to the more explicit value. Compaction runs via `context.compact` wrapped in a promise with notify-on-error.

## Adjacent internals verified

- **Schema evidence is data**: `types.ts:6-7` defines the discriminated union `{kind:"file_contains"; path; literal}` and `{kind:"file_sha256"; path; sha256}` — evidence claims are structured values a verifier can re-check, not prose.
- **GlobalActorRegistry.resolve** (:46-64): exact id → unique-prefix → exact name; AMBIGUOUS PREFIX THROWS rather than guessing. The registry is a machine-global TEMPLATE library (definitions + identity, never history); atomic temp+rename writes with last-write-wins concurrency; loaded once, refreshed by `/fabric reload`.
