<!-- capsule-v2 -->
# Budget ledger — cross-process cost accounting for a recursion tree

**Source:** pi-fabric (monotykamary) MIT `<branch>@<commit>`; Codebase Memory `pi-fabric`. **Question:** how does a tree of Pi processes track and bound total spend across nodes without a shared DB?

## Connected graph-selected seam
**Path/Symbol:** `src/agents/budget-ledger.ts` (read in full): `activeBudgetState()`, `initBudgetLedger(budget)`, `useBudgetLedger(state)`, `clearOwnedBudgetEnv()`, `readBudgetLedger(file)`, `appendBudgetLedger(file, entry)`, `readBudgetLedgerDetailed(file)`.
**Signature:** `initBudgetLedger(budget)` (root only, depth 0) does `fs.mkdtempSync(tmpdir/pi-fabric-budget-)`, writes empty `cost.jsonl` mode 0o600, seeds three env vars, returns `{budget, file, id}`; `appendBudgetLedger(file, entry)` does `fs.appendFileSync(file, JSON.stringify(entry) + "\n")`.
**Data Shape:** `BudgetLedgerEntry { id, depth, cost, tokens, ts, runner?, actorId?, actorName?, input?, output?, cacheRead?, cacheWrite? }`; env contract `PI_FABRIC_BUDGET` / `PI_FABRIC_BUDGET_FILE` / `PI_FABRIC_BUDGET_ID` (16 hex chars from randomUUID), forwarded to children via `{...process.env}`.

### Decisive source
```ts
// O_APPEND makes small single-line writes atomic across concurrent writers on POSIX
fs.appendFileSync(file, JSON.stringify(entry) + "\n")
// tolerant read: malformed lines ignored; missing file returns zeros
// root-only init seeds env; clearOwnedBudgetEnv deletes all three on owner close
```

**Flow:** each node's AgentManager records the cost of the children it spawns into a single append-only JSONL file, and checks accumulated spend before spawning another child. Root-only init (depth 0) creates the ledger + seeds env; workers forward env to children. Cost recorded only after a child finishes (append-after-completion). `readBudgetLedger` is a tolerant sum (one bad entry never aborts); `readBudgetLedgerDetailed` does full rollups (byRunner, byActor, entries, token kinds).
**Invariant:** the check is best-effort (concurrent children can each pass before cost lands, so a tree may slightly overshoot) — the race-free ceiling is the per-execution call count (`agents.maxPerExecution`); ledger file created mode 0o600 (owner-only); `clearOwnedBudgetEnv` prevents a long-lived host leaking a budget into a later unrelated session.
**Probe:** `tests/` budget-ledger coverage (append-after-completion ordering; tolerant read of a malformed line; env seeding/clearing on root init/close).

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "pi-fabric", query: "budget ledger append read env cost tokens recursion", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the append-only JSONL ledger with root-only init, O_APPEND atomic writes, tolerant reads, and env-based propagation; adapt env var names and budget source to host; pair with a race-free call-count ceiling (the ledger alone is not a hard limit).
