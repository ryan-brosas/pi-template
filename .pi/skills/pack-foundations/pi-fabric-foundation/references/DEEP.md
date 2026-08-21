# Pi Fabric Foundation — Deep Reference


# Pi Fabric Foundation

A deep reference for pi-fabric (monotykamary). MIT License. Branch `feat/veda-runner`, commit b709edb (2026-08-13). Root: `/mnt/hdd/utopia/inspo/pi-fabric`. Graph: 4354 nodes / 17822 edges. Packages: ui, compaction, agents, memory, core, actors, providers, state, audit, residency, config, topology, worker, schema, activity. The template's Schema guard is built on this. Three things to mine: the **cross-process budget ledger**, the **UTF-8-safe compaction bounds**, and the **Schema mutation guard**.

## Architecture

```
src/schema/        -> the mutation guard: controller.ts (transaction journal), types.ts (evidence), workspace.ts
src/compaction/    -> bounds.ts (clipUtf8), render.ts, branch-summary.ts, branch-details.ts, threshold.ts, qa.ts, hook.ts
src/agents/        -> budget-ledger.ts (cross-process cost), thinking-transfer.ts (clipUtf8 digest)
src/actors/        -> global-registry.ts (GlobalActorRegistry.resolve, fan-in 25), manager, delivery-policy, predicate
src/providers/     -> memory, state, mesh, compact, schema (the native providers)
src/ui/            -> transcript-sanitization.ts (recordOf), format, highlight (highlightCode), types
```

Boundaries (graph): fabric-state->topology (19), fabric-state->providers (13), providers->memory (13), fabric-state->actors (10), ui->config (8). Hotspots: GlobalActorRegistry.resolve (25), safeText (20), ActorManager.#publicInfo (16), recordOf (13), clipUtf8 (13), highlightCode (12).

## Primitive 1: cross-process budget ledger (src/agents/budget-ledger.ts)

A recursion tree spans one Pi process per node. Each node's AgentManager records the cost of the children it spawns into a **single append-only JSONL file**, and checks accumulated spend before spawning another child.

**Env contract (PI_FABRIC_BUDGET*):**
- `PI_FABRIC_BUDGET` — the budget number.
- `PI_FABRIC_BUDGET_FILE` — the shared ledger path.
- `PI_FABRIC_BUDGET_ID` — the tree id (16 hex chars from a randomUUID).

The worker forwards these to child Pi processes via `{ ...process.env }`. Mirrors ypi's RLM_BUDGET / RLM_COST_FILE model.

**The honest semantics (read this):**
- The check is **best-effort** — concurrent children can each pass the check before any cost lands, so a tree may slightly overshoot.
- The **race-free ceiling** remains the per-execution call count (`agents.maxPerExecution`).
- Cost is recorded **only after a child finishes** (append-after-completion), matching ypi.

**Functions:**
- `activeBudgetState()` — read inherited budget; returns undefined when no budget is active.
- `initBudgetLedger(budget)` — root-only (depth 0): mkdtemp, 0600 file, seed the three env vars.
- `useBudgetLedger(state)` / `clearOwnedBudgetEnv()` — re-seed / clear so a long-lived host doesn't leak a budget into an unrelated later session.
- `readBudgetLedger(file)` — tolerant sum; malformed lines ignored (a bad entry never aborts the read).
- `appendBudgetLedger(file, entry)` — O_APPEND single-line append (atomic across concurrent writers on POSIX); a write failure never breaks the run.
- `readBudgetLedgerDetailed(file)` — full rollups: byRunner, byActor, per-entry, token kinds (input/output/cacheRead/cacheWrite).

**Entry shape:** id, depth, cost, tokens, ts, runner?, actorId?, actorName?, input?, output?, cacheRead?, cacheWrite?.

## Primitive 2: UTF-8-safe compaction bounds (src/compaction/bounds.ts)

- `MAX_SUMMARY_BYTES = 32 * 1024`; `MAX_REQUEST_SOURCE_BYTES = 8 * 1024`.
- `utf8Bytes(text)` — TextEncoder byte length.
- `clipUtf8(text, maxBytes, suffix="…")` — iterates **code points**, never splitting a multibyte char; reserves suffix bytes; returns the clipped text + suffix.
- `canonicalizeText(input, maxBytes)` — trim + collapse whitespace + clip; returns `{ text, truncated, sourceBytes }`.
- **`sampleAddressedFrom(source, maxValues)`** — the omitted-range pattern: keeps the earliest half + latest half, counts omissions, and records `omittedFirstEntryId`/`omittedLastEntryId` so the omission line names the actual range.
- `omissionLine(count, first, last, noun)` — `… omitted N noun; source entries <first> → <last>`. **This is the pattern to copy when you sample and must not lose provenance.**

## Primitive 3: the Schema mutation guard (src/schema/)

**Evidence types** (types.ts) — what a hypothesis can cite:
- `file_exists` / `file_absent` / `file_contains { path, literal }` / `file_sha256 { path, sha256 }` / `trusted_command { name }`.

**File operations** (the only things a commit may declare):
- `write { path, content, expected: { absent } | { sha256 } }`
- `edit { path, oldText, newText, expectedSha256 }`
- `delete { path, expectedSha256 }`

**Records:**
- `SchemaHypothesisRecord`: id, label, summary, evidence[], complexityReduction, parentToolCallId, state binding, fingerprint, generation, status (active | verified | committed | aborted | abandoned).
- `SchemaCertificateRecord`: tokenHash, hypothesisId, parentToolCallId, state binding, fingerprint, generation, issuedAt, expiresAt, status (active | consumed | aborted | abandoned).
- `stateBinding(head)` — binds a hypothesis to the state head (transitionId, version, to).

**Transaction journal** (controller.ts): a `TransactionJournal` with status prepared | applying | committed | rolled_back | quarantined, carrying `before` images (path, absolute, existed, content?, mode?) for rollback. `OUTPUT_LIMIT = 64 * 1024` for trusted-command output.

**allowlist** — enforce mode only permits read refs (pi.read, pi.grep, pi.find, pi.ls, memory.recall/expand/sessions, state.get/history/complexity, mesh.self/read/members/get/list, compact.status, schema.status/hypothesize, ...). **The lesson: a mutation guard is an allowlist of read refs + a transaction journal with before-images + sha256 postconditions.**

## How to use

- **When you need a cost budget across agent recursion** -> port `budget-ledger.ts`: append-only JSONL, env propagation, append-after-completion, tolerant reads, best-effort check with a race-free per-execution ceiling.
- **When you need a mutation guard** -> the Schema loop (hypothesize -> verify -> commit) with evidence kinds, declared file ops with sha256 postconditions, and a transaction journal with before-images.
- **When you need UTF-8-safe context clipping** -> `clipUtf8` (code-point iteration, suffix reserve).
- **When you need to sample without losing provenance** -> `sampleAddressedFrom` + `omissionLine` (earliest/latest halves + named omitted range).
- **When you need actor resolution** -> `GlobalActorRegistry.resolve` (fan-in 25).

## Red Flags

- Treating the budget as a hard ceiling (it's best-effort; concurrent children overshoot).
- A mutation guard with no before-images (can't roll back) or no sha256 postcondition (can't verify).
- clipUtf8 implemented with byte slicing (splits multibyte chars).
- Sampling that drops the omitted range (loses provenance).
- Trusting a committed guard without a certificate.

## Verification

- Ledger append-after-completion works across child processes; malformed lines don't abort reads.
- Schema commit blocks on a failed postcondition; rollback restores before-images.
- clipUtf8 never splits a multibyte char.
- sampleAddressedFrom names the exact omitted range.

## Skill Result Contract

```xml
<skill_result>
  <skill>pi-fabric-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, checks run</evidence>
  <artifacts>Ported pattern + path</artifacts>
  <risks>Overstated ceiling, uncommitted guard, split multibyte, or none</risks>
</skill_result>
```
