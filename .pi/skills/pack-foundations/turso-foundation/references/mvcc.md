# Turso — MVCC Reference

Source-grounded reference for `core/mvcc/database/mod.rs` (10,296 lines, walked in full by the forge worker) with probes sampled from `tests.rs` (20,570 lines). Model lineage: the Hekaton paper (cite comments in-file).

## P1 — Two-phase version timestamps: TxID while active, Timestamp after commit

- **WHO** `RowVersion`, `TxTimestampOrID`, `PackedTs`, `Transaction`, `AtomicTransactionState`.
- **WHAT** Every row version has bit-packed begin/end fields holding either a committed Timestamp or an in-flight TxID; transaction state is one atomic u64 encoding Active/Preparing(ts)/Committed(ts)/Aborted/Terminated.
- **WHEN** Active phase versions track TxID; at commit the RewriteLiveVersions step rewrites TxID→Timestamp in chunks; readers resolve stale TxIDs via the txs map plus a finalized_tx_states cache.
- **WHERE** `mod.rs:393-446` (PackedTs pack/unpack, TIMESTAMP_TAG=1<<62, TXID_TAG=1<<63); doc :808-826; TransactionState::encode :1308-1400 (PREPARING_BIT=0x4000…, COMMITTED_BIT=0x8000…, TIMESTAMP_MASK=0x3fff…); visibility predicates :10090-10240.
- **WHY** Verbatim (:393-399): "Packed representation of Option<TxTimestampOrID> in a single u64, halving the size of the begin/end fields (16 bytes each -> 8)… The two distinct tag bits (rather than a zero sentinel) are required because Timestamp(0) is a real value - the logical clock hands out timestamp 0 to the first transaction." Deferring timestamp assignment to commit lets writers run lock-free (optimistic CC).
- **HOW** Visibility = is_begin_visible && is_end_visible. Committed arms assert strict monotonicity (:10094-10097); missing live tx falls back to finalized_tx_states; both fall through conservatively (begin:false, end:true). A known Hekaton-paper TYPO is corrected inline (:10182-10186): a transaction can see a row version whose end is a TxID only if it isn't the same transaction (source: avi.im/blag/2023/hekaton-paper-typo).
- **LESSON** Encode per-version liveness as (begin,end) pairs of tagged u64s and keep transaction fate in one atomic word — every concurrency decision reduces to lock-free state lookup, not locking.
- **PROBE** `tests.rs:6678-6815` hand-builds transactions/versions and asserts is_visible_to per Hekaton Tables 1/2 ("tx 8 with Preparing(3): current_tx can speculatively read" → commit_dep_counter==1).

## P2 — First-committer-wins conflicts, deferred entirely to commit

- **WHO** CommitStateMachine::check_rowid_for_conflicts / check_index_for_conflicts / check_version_conflicts; `is_write_write_conflict`.
- **WHAT** Inserts never conflict-check ("pure optimistic", :5150-5156); at commit, every write-set entry's version chain is validated via end_ts comparison → `LimboError::WriteWriteConflict`.
- **WHEN** In CommitState::Commit, after end_ts allocation and Preparing publication, before building the logical-log record.
- **WHERE** checks :1857-2040; commit arm :2860-2885; rules :9880-9925 quoting Hekaton p.301 §2.6.
- **WHY** Verbatim: "A row that we are trying to commit was deleted/updated by another committed transaction after our begin timestamp. Even if that version is now \"ended\", this is still a write-write conflict" (:1955-1960). And (:9905-9908): "A non-\"infinity\" end timestamp functions as a write lock on the row." Early validation would block writers or miss races.
- **HOW** Reverse chain scan for early exit. Rules: committed end-Timestamp > begin_ts → conflict; in-flight B-tree tombstones act as write locks; own TxID skipped; Preparing-vs-Preparing tie-breaks on LOWER end_ts ("they win"); unknown tx treated conservatively as conflict (TODO verbatim :1998-2001). Unique-index conflicts use prefix-key range scans, skipping non-unique indexes and NULL keys (:1893-1933).
- **LESSON** Defer all conflict detection to ONE commit-time validation pass over the write set — optimism at write time buys concurrency; a single reverse scan with state-based tie-breaking buys write serializability cheaply.
- **PROBE** `tests.rs:14887` / `14943`: T1 insert-commit, T2 begin, Td delete/update-commit, T2 re-write then commit → both assert WriteWriteConflict.

## P3 — Hekaton commit dependencies: counted speculative reads instead of blocking

- **WHO** commit_dep_counter / abort_now / commit_dep_set; register_commit_dependency; WaitForDependencies; rollback cascade.
- **WHAT** Speculatively reading a Preparing writer's version (or speculatively ignoring its deletion) registers a dependency: reader's counter++, writer's dep_set += reader. A tx commits only when its counter hits 0; if a depended-on tx aborts, dependents get abort_now=true.
- **WHERE** field docs :1000-1015 (Hekaton §2.7 verbatim); register :9940-9995; wait step :2886-2965; speculative arms :10120-10135/:10180-10195; tombstones :9820-9850; cascade :6540-6555.
- **WHY** Verbatim: "Deadlock impossible: edges always go from higher end_ts to lower end_ts, so the wait graph is acyclic" (:2905-2910). Memory-ordering trap (:2918-2926): check abort_now AFTER counter==0 — the Acquire load of counter synchronizes-with the Release fetch_sub; opposite order has a TOCTOU race seeing (false, 0). Underflow guard (:9975-9980): increment BEFORE dep_set insert and BEFORE dropping the lock.
- **HOW** Even read-only commits must honor dependencies (:2840-2852) — a SELECT may have speculatively read from a Preparing tx. Registration holds the writer's dep_set mutex to serialize with the drain.
- **LESSON** Convert potential reader-writer waits into counted dependencies resolved at commit boundaries — but get increment/drain/check orderings exactly right or you trade blocking for underflow and TOCTOU abort races.
- **PROBE** `tests.rs:6940` speculative read returns visible AND counter==1 AND dep_set={2}; `tests.rs:6974` cascade abort sets abort_now and drains to 0.

## P4 — Commit as an IO-yielding state machine; step order IS the correctness spec

- **WHO** CommitStateMachine / CommitState (Initial → Commit → WaitForDependencies → BuildLogRecord → BeginCommitLogicalLog → … → CommitEnd → RewriteLiveVersions → FinalizeCommit).
- **WHAT** Stepwise commit so every IO yields; transitions allocate end_ts atomically with Preparing under the clock lock, validate conflicts, build a pre-serialized LogRecord (schema ops BEFORE data ops), write/sync the logical log, mark Committed, rewrite TxID refs in chunks, drain dependents, publish watermarks.
- **WHERE** enum + MVCC_COMMIT_BATCH_SIZE=1024 ("keeps a CREATE INDEX on a 2M-row table responsive") :1408-1561; Initial TOCTOU fix :2760-2860; collect_versions :2225-2320; ordering comment :3228-3262; watermark fetch_max :3300-3345.
- **WHY** Verbatim ordering rationale (:3229-3249): "(1) must precede (5): the commit lock serializes log writes… (2) must precede (3): rewriting before marking Committed would publish effects before fate is decided… (2) must also precede (5): the next committer's validation checks our state." Regression guard: an OLDER txn finishing later must not lower the global header timestamp — "used in checkpointing as a watermark boundary; incorrect lower value can cause data loss / corruption." End_ts TOCTOU fix: atomically generate end_ts and publish Preparing under the clock lock.
- **HOW** Logical log records only this tx's contribution; speculatively-ended versions leave end unset ("tx_b will take care of logging the deletion"); schema rows serialize before data rows so replay sees table_id_to_rootpage before row ops; table ids canonicalize to -(root_page) for recovery bootstrap. cleanup_unfinished_commit handles abandon-mid-RewriteLiveVersions (issue #7477) by finishing the rewrite synchronously.
- **LESSON** When commit spans async IO, make the TRANSITION ORDER itself the correctness spec — document why each step precedes the next, and route every crash path through one cleanup that replays remaining invariants.
- **PROBE** `tests.rs:2309` injects a yield at CommitValidation while a concurrent tx tombstones the row, asserting serialization; `tests.rs:2053` restart-recovery asserts clock monotonicity (new begin_ts > max pre-restart commit ts).

## P5 — Begin publishes snapshot atomically with its timestamp; rollback invalidates in place

- **WHAT** begin allocates begin_ts + captures header/schema_generation/WAL read_mark and inserts the Transaction into txs INSIDE the clock callback. Rollback marks Aborted, cascades abort_now, then rewrites write-set versions in place: own-created → (None,None) garbage; own-deletes lose their end. The tx is removed only after ALL chain locks were taken.
- **WHERE** begin :6055-6135 (+ same fix :5940-5960), rollback :6520-6590, rollback_row_version :9640-9660 (Hekaton §2.4), remove_tx :6140-6180.
- **WHY** Verbatim begin-publish window (:6078-6090): between allocating the snapshot ts and inserting into txs, the txn is invisible to compute_lwm — inline GC could reclaim a version this snapshot needs, "a snapshot-isolation violation." remove_tx asserts drained dep_set: removing with non-empty deps "will wait forever (deadlock)."
- **HOW** rollback_row_version: begin==TxID(me) → (None,None); end==TxID(me) → clear end (undo deletion). GC Rule 1 sweeps garbage. Savepoints track created/deleted ids finer-grained and prune write-set entries only when no surviving uncommitted version remains (:6830-6900).
- **LESSON** Publish your snapshot atomically with its timestamp or GC races your begin window; implement rollback as in-place garbage markers, letting normal GC do reclamation.
- **PROBE** `tests.rs:10441` rollback creates aborted garbage → drop_unused_row_versions()==1, SkipMap slot stays (lazy removal).

## P6 — Version GC at the intersection of two clocks

- **WHAT** Three-rule per-chain GC: (1) aborted garbage always removed; (2) superseded versions removed below LWM AND materialized_at ≤ min reader WAL mark; (3) last current version dropped only when durably in the B-tree and reachable by every frozen read_mark.
- **WHERE** compute_lwm :7080-7095; materialized_at doc :118-135; WalPos sentinels :3860-3885; gc_version_chain rules :7640-7712 (#7638 tombstone retention); gc_incremental gate :7300-7360; is_btree_readable_at :9620-9660.
- **WHY** Rule-2 trap verbatim (:7690-7695): "Tombstones without a committed current successor must survive, as must versions already in the B-tree. Dropping the latter erases the only evidence that a later delete must be written (#7638)." LWM-stuck short-circuit stops should_gc spinning per commit. Physical gate: without materialized_at ≤ read_mark, "a transaction that opened before a checkpoint materialization would seek a page its read mark cannot reach (a torn/foreign/zeroed-page read)."
- **HOW** min_reader_mark clamped further by backfill_floor ("never reclaim a version materialized in un-backfilled WAL frames"). Inline passes bounded (MAX_CHAINS_PER_GC=4096, DEFAULT_GC_VERSION_THRESHOLD=16*1024 new versions), single-flight CAS + RAII reset, chains shrink to capacity/4 (CHAIN_SHRINK_MIN_CAPACITY=16). set_end/set_begin reset materialized_at to ORIGIN — "over-resetting is safe: it only delays GC, never reclaims early."
- **LESSON** Reclamation is safe only at the intersection of two clocks — logical (no snapshot below me) and physical (no reader below my durable WAL frame). Track both; prefer delayed GC over any early free.
- **PROBE** `tests.rs:10485` builds 1 committed + 1023 garbage versions → gc drops 1023, len 1, capacity shrunk ≤¼+slack; `tests.rs:6910-6935` finalized-tx cache pruning.
