# Pi Fabric — Budget Ledger Reference

Cross-process cost accounting for a Fabric recursion tree. Source: `src/agents/budget-ledger.ts` (read in full).

## The model

A recursion tree spans **one Pi process per node**. Each node's AgentManager records the cost of the children it spawns into a single append-only JSONL file, and checks accumulated spend before spawning another child. Mirrors ypi's RLM_BUDGET / RLM_COST_FILE model.

## Env contract

| Var | Meaning |
|---|---|
| `PI_FABRIC_BUDGET` | the budget number |
| `PI_FABRIC_BUDGET_FILE` | the shared ledger path |
| `PI_FABRIC_BUDGET_ID` | tree id (16 hex chars from randomUUID) |

The worker forwards these to child Pi processes via `{ ...process.env }`.

## API (exact)

- `activeBudgetState(): BudgetLedgerState | undefined` — reads inherited env; undefined when no budget active (missing file, or budget <= 0, or non-finite).
- `initBudgetLedger(budget): BudgetLedgerState` — **root only (depth 0)**: `fs.mkdtempSync(tmpdir/pi-fabric-budget-)`, writes empty `cost.jsonl` with mode 0o600, seeds the three env vars, returns `{ budget, file, id }`.
- `useBudgetLedger(state)` — re-seed env (used when re-attaching).
- `clearOwnedBudgetEnv()` — deletes all three; called by the depth-0 manager on close so a long-lived host doesn't leak a budget into a later unrelated session.
- `readBudgetLedger(file): { cost, tokens }` — tolerant sum: malformed lines ignored (ypi semantics: one bad entry never aborts the read); missing file returns zeros.
- `appendBudgetLedger(file, entry)` — `fs.appendFileSync(file, JSON.stringify(entry) + "\n")`. **O_APPEND makes small single-line writes atomic across concurrent writers on POSIX.** A write failure is swallowed — the next check still guards via the per-execution call ceiling.
- `readBudgetLedgerDetailed(file): BudgetLedgerDetail` — full rollups: byRunner, byActor, entries[], plus input/output/cacheRead/cacheWrite token kinds. Validates entries (id string, cost/tokens/ts numbers); legacy flat rows accepted.

## Entry shape

```ts
interface BudgetLedgerEntry {
  id: string; depth: number; cost: number; tokens: number; ts: number;
  runner?: string; actorId?: string; actorName?: string;
  input?: number; output?: number; cacheRead?: number; cacheWrite?: number;
}
```

## The honest semantics (read this)

- The check is **best-effort**: concurrent children can each pass the check before any cost lands, so a tree may slightly overshoot.
- The **race-free ceiling** remains the per-execution call count (`agents.maxPerExecution`).
- Cost is recorded **only after a child finishes** (append-after-completion).
- Ledger file created with mode 0o600 (owner-only).

## Porting recipe

1. Copy the module; keep the three env vars (or rename consistently).
2. Root-only init: mkdtemp + 0600 + seed env.
3. Append-after-completion only; O_APPEND single-line writes.
4. Tolerant reads (skip malformed lines).
5. Pair with a race-free ceiling (call count) — the ledger alone is not a hard limit.
6. Clear env on owner close.
