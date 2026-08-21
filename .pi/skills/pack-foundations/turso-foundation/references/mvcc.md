# Turso — MVCC Reference

Complete source-grounded reference (walked in full by the forge worker) for the optimistic MVCC layer in `core/mvcc/database/mod.rs` (10,296 lines), with probes sampled from `tests.rs` in `core/mvcc/database/tests.rs`.

Complete source-grounded reference for turso's optimistic MVCC layer. File: `core/mvcc/database/mod.rs` (10,296 lines, walked in full); probes sampled from `tests.rs` (20,570 lines). The design descends from the **Hekaton paper** — cite comments name it throughout, including one place where turso corrects a typo *in the paper itself*.

## The version model: two tagged u64s per boundary

Every row version carries `begin` and `end` fields, each a single bit-packed u64 (`PackedTs`, mod.rs:393-446) that holds either a committed **Timestamp** or an in-flight **TxID**, discriminated by tag bits (`TIMESTAMP_TAG = 1<<62`, `TXID_TAG = 1<<63`). Two tags rather than a zero sentinel, because zero is a real value:

> "The two distinct tag bits (rather than a zero sentinel) are required because Timestamp(0) is a real value - the logical clock hands out timestamp 0 to the first transaction." (mod.rs:393-399)

During a transaction's active phase its new versions track its **TxID**; after commit, the RewriteLiveVersions step rewrites them to the commit **Timestamp** in chunks (mod.rs:808-826 documents the switch). Transaction fate itself lives in ONE atomic u64 per transaction (`TransactionState::encode`, mod.rs:1308-1400): Active / Preparing(ts) / Committed(ts) / Aborted / Terminated, with `PREPARING_BIT` and `COMMITTED_BIT` above a 62-bit timestamp mask.

Visibility of a version to a reader reduces to two predicates — `is_begin_visible && is_end_visible` (mod.rs:10090-10240). Committed-Timestamp arms assert strict monotonicity ("begin_ts and committed rv_begin_ts cannot be equal"); TxID arms look up the creator/deleter's state (live map first, then a `finalized_tx_states` cache) and fall through **conservatively** — begin invisible, end visible.

One subtlety worth porting on its own: turso fixes a typo in the Hekaton paper (mod.rs:10182-10186) — a transaction can see a row version whose end field is a *TxID* only when that TxID is not its own.

**Lesson:** encode per-version liveness as (begin, end) pairs of tagged u64s and keep transaction fate in one atomic word — then every concurrency decision becomes a lock-free state lookup instead of locking.

**Probe:** tests.rs:6678-6815 hand-builds transactions and versions and asserts `is_visible_to` outcomes against Hekaton's Tables 1 and 2.

## Conflicts live at commit — and only there

Inserts never check for conflicts:

> "NOTE: We do NOT check for conflicts at insert time (pure optimistic). Conflicts are detected at commit time using end_ts comparison." (mod.rs:5150-5156)

At commit, every write-set entry's version chain is validated once (`check_rowid_for_conflicts` / `check_index_for_conflicts`, mod.rs:1857-2040), driven from the Commit state (mod.rs:2860-2885). The rules, quoting the source:

- A committed end-timestamp **greater than our begin_ts** is a conflict — "Even if that version is now \"ended\", this is still a write-write conflict" (:1955-1960).
- A non-infinity end timestamp "functions as a write lock on the row, so it can never be updated by another transaction" (:9905-9908, again Hekaton §2.6).
- In-flight B-tree tombstones count as those write locks; our own TxID references are skipped.
- Preparing-vs-Preparing races tie-break on the **lower end_ts** — "Other tx has lower end_ts, they win."
- Unknown transaction ids are treated conservatively as conflicts, with an admitted TODO (:1998-2001).

Chains are scanned in reverse so conflicts exit early. Unique-index conflicts run a prefix-key range scan and deliberately skip non-unique indexes and NULL keys (SQLite semantics, :1893-1933).

**Lesson:** optimism at write time buys concurrency; deferring validation to a single reverse scan over the write set buys first-committer-wins serializability without waits.

**Probe:** tests.rs:14887 and :14943 stage T1-insert → Td-delete/update-commit → T2-rewrite-commit and assert `WriteWriteConflict` both times.

## Commit dependencies: counted speculation instead of blocking

When a reader speculatively reads a version whose deleter is still **Preparing** — or speculatively ignores such a deletion — it does not wait. It registers a dependency: its own `commit_dep_counter` increments, and its tx_id enters the writer's `commit_dep_set` (register_commit_dependency, mod.rs:9940-9995; speculative arms at :10120-10195 and tombstone handling :9820-9850). A transaction cannot commit until its counter drains to zero (WaitForDependencies, :2886-2965); if something it depended on aborts, `abort_now` is set and it rolls back too.

Three correctness details in the source are easy to get wrong:

1. **Acyclicity is structural**: "edges always go from higher end_ts to lower end_ts, so the wait graph is acyclic" (:2905-2910).
2. **Memory-ordering trap** (:2918-2926): check `abort_now` AFTER observing counter==0. Rollback stores abort_now with Release *before* decrementing with AcqRel, so an Acquire load of zero synchronizes with it. Check in the opposite order and an aborting dependency can slip between your two reads — you see `(false, 0)` and wrongly commit.
3. **Underflow guard** (:9975-9980): increment the counter BEFORE inserting into the set and before dropping the lock, or an abort drain can wrap 0 to u64::MAX.

Even read-only commits must drain dependencies (:2840-2852): a SELECT may have speculated against a Preparing writer.

**Lesson:** convert reader-writer waits into counted dependencies resolved at commit boundaries — but the increment/drain/check orderings ARE the algorithm; get them wrong and you trade blocking for underflow and TOCTOU commits.

**Probe:** tests.rs:6940 asserts a speculative read is visible AND leaves counter==1 with dep_set={2}; tests.rs:6974 asserts cascade abort flips abort_now and drains to 0.

## The commit state machine: step order is the spec

Commit runs as an IO-yielding state machine (Initial → Commit → WaitForDependencies → BuildLogRecord → BeginCommitLogicalLog → … → CommitEnd → RewriteLiveVersions → FinalizeCommit), because any step may hit disk. Its transition ORDER encodes the durability and isolation invariants — documented verbatim at mod.rs:3229-3249:

> "(1) must precede (5): the commit lock serializes log writes… (2) must precede (3): rewriting before marking Committed would publish the transaction's effects to readers before its fate is decided… (2) must also precede (5): the next committer's validation checks our transaction state."

Two more ordered decisions deserve porting:

- **end_ts allocation is atomic with Preparing publication**, both under the clock lock (:2760-2795) — closing a TOCTOU window between "chose my timestamp" and "world can see me preparing."
- **The global header timestamp only moves forward** (`fetch_max`, :3300-3345): an older transaction can finish after a newer one, and since this value bounds checkpointing, "an incorrect lower value can cause data loss / corruption."

The logical log records only the committing transaction's contribution: own versions get `begin = Timestamp(end_ts)`; versions this tx speculatively ended leave `end` unset because "tx_b will take care of logging the deletion" (:2290-2300). Schema rows serialize before data rows "so replay sees table_id_to_rootpage updates before row ops reference those ids" (:2385-2388), and table ids canonicalize to negative root-page numbers so recovery bootstraps cleanly. Large write sets yield every `MVCC_COMMIT_BATCH_SIZE = 1024` rowids — sized, per the comment, to keep a CREATE INDEX on a 2M-row table responsive.

Abandonment has one choke point: `cleanup_unfinished_commit` (:1690-1725) inspects observed state and either finishes or rolls back — including issue #7477, where a drop mid-RewriteLiveVersions must complete the rewrite synchronously.

**Lesson:** when a commit spans async IO, make the TRANSITION ORDER itself the correctness spec — document why each step precedes the next, and route every crash path through one cleanup that replays the remaining invariants.

**Probe:** tests.rs:2309 injects a yield at CommitValidation while a concurrent transaction tombstones the row, asserting serialization; tests.rs:2053 restarts the database and asserts the clock reseeds monotonically from the log.

## Begin and rollback: publish atomically, invalidate in place

Begin allocates begin_ts and inserts the Transaction into the live map **inside the same clock-lock critical section** (:6055-6135). The comment explains what breaks otherwise:

> "This closes the 'begin-publish window': between allocating a snapshot timestamp and inserting into txs, the txn is invisible to compute_lwm. Inline GC runs on the commit path… so a writer that commits in that window could compute an LWM above our begin_ts and reclaim a version this snapshot still needs - a snapshot-isolation violation."

Rollback (:6520-6590) never surgically removes chains. It marks the transaction Aborted, cascades abort_now to dependents, then rewrites each write-set version **in place** following Hekaton §2.4 (:9640-9660): versions it created become `(None, None)` — invisible garbage the normal GC sweep reclaims; rows it deleted simply lose their end timestamp, undoing the deletion. Only after every chain lock in the write set was acquired is the transaction removed from the live map (:6140-6180) — and removal ASSERTS an empty dependency set, because "those dependencies will wait forever (deadlock)."

Savepoint rollback is finer-grained still: savepoints track created/deleted version ids, retain created versions by id, clear end on deleted ones, and prune write-set entries only when no surviving uncommitted version remains (:6830-6900).

**Lesson:** publish your snapshot atomically with its timestamp, or GC will race your begin window; implement rollback as in-place invalidation and let the ordinary GC sweep do reclamation.

**Probe:** tests.rs:10441 — rollback leaves versions with `(None, None)` bounds; `drop_unused_row_versions()` returns 1 while the SkipMap slot remains (lazy removal).

## GC at the intersection of two clocks

A version may be reclaimed only when BOTH clocks allow it:

1. **Logical clock (LWM)** — no active or preparing transaction's snapshot begins below it (`compute_lwm`, :7080-7095).
2. **Physical clock (WAL read-marks)** — the version's content is durably materialized in the B-tree at a position every reader's frozen read-mark can reach. `RowVersion.materialized_at` (:118-135) tracks the WAL position where the version landed; `is_btree_readable_at` (:9620-9660) gates on logical AND physical reachability — without it, "a transaction that opened before a checkpoint materialization would seek a page its read mark cannot reach (a torn/foreign/zeroed-page read)."

Per-chain rules (`gc_version_chain`, :7640-7712): aborted garbage always goes; superseded versions go below LWM once materialized; the current version goes last, only when B-tree-resident. One trap is called out by issue number:

> "Tombstones without a committed current successor must survive, as must versions already in the B-tree… Dropping the latter erases the only evidence that a later delete must be written (#7638)."

The incremental pass is bounded (MAX_CHAINS_PER_GC=4096, triggered past DEFAULT_GC_VERSION_THRESHOLD=16×1024 new versions), single-flighted via CAS with RAII reset, short-circuits while the LWM is pinned (resetting its trigger baseline "so should_gc doesn't spin on every commit"), clamps candidate materialization by a backfill floor ("never reclaim a version materialized in un-backfilled WAL frames"), and shrinks surviving chains to capacity/4 (CHAIN_SHRINK_MIN_CAPACITY=16). Any `set_begin`/`set_end` resets materialized_at to ORIGIN — "over-resetting is safe: it only delays GC, never reclaims early" (:9720-9722).

**Lesson:** memory reclamation in an MVCC store is safe only at the intersection of two clocks — logical (no snapshot needs it) and physical (no reader is below its durable position). Track both explicitly, and prefer delayed GC over any early free.

**Probe:** tests.rs:10485 builds a chain of 1 committed + 1023 aborted-garbage versions, runs gc_version_chain, and asserts dropped==1023, len==1, capacity shrunk to ≤¼+slack; tests.rs:6910-6935 covers finalized-tx cache pruning.
