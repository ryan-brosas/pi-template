# Turso — B-tree & Pager Reference

Source-grounded reference. `core/storage/btree.rs` (14,335 lines) and `core/storage/pager.rs` (6,870 lines) read IN FULL by the forge worker.

## P1 — Balancing heuristics: 3-siblings-in / 5-pages-out, the 2/3 rule, and the append fast path

- **WHO** every INSERT/UPDATE/DELETE via BTreeCursor's write path.
- **WHAT** On overflow/underflow, up to MAX_SIBLING_PAGES_TO_BALANCE=3 adjacent pages are gathered under one parent and redistributed into ≤MAX_NEW_SIBLING_PAGES_AFTER_BALANCE=5 pages; balance_quick handles the dominant append case cheaply.
- **WHEN** balance() runs after overflow insertion or when `free_space*3 > usable_space*2` (page < ~2/3 full) after overwrite/delete (:2998, :6810-6827). balance_quick ONLY for: table leaf + exactly 1 overflow cell + it's the last cell + parent isn't page 1 + leaf is the rightmost child (:3104-3168).
- **WHERE** constants :144-150 (also BTCURSOR_MAX_DEPTH=20); naive-algorithm doc :3039-3041 ("Sqlite tries to have a page at least 40% full"); already-balanced gate :3070-3082 citing sqlite btree.c#L9064-L9071.
- **WHY** The 5-page bound is PROVEN in-comment (:149): "we can guarantee that cells from 3 pages will fit in 5 pages" — and an assert at :3862 turns violation into corruption detection rather than fixed-array overflow. The 2/3 rule prevents delete-loops balancing barely-underfull pages. balance_quick exists because sequential rowid appends would otherwise pay full 3-sibling redistribution per insert — it allocates one new rightmost leaf and inserts a ≤13-byte divider ([u8;13] = 4-byte page ptr + max 9-byte varint).
- **HOW** WriteState machine saves the seek key first (balancing invalidates cursor position); walks Start → BalanceRoot (root split = copy-to-child, root becomes interior) → Decide(Quick|NonRootPickSiblings) → CellArray redistribution; restore_context re-seeks after.
- **LESSON** Bound the blast radius of rebalancing structurally (3→5 pages, asserted), and special-case the common pattern (append) before running the general algorithm — the general path then only handles rare cases, and its invariants become checkable.
- **PROBE** `test_delete_balancing` (~12480): 10k rows, delete a middle range, assert survivors exist/deleted gone + validate_btree() recursion; quick-path split probe ~13660.

## P2 — Cell redistribution: left-biased packing + MANDATORY legality-repair pass, and the OVERFLOW CELL ADJUSTMENT index arithmetic

- **WHAT** All cells from ≤3 siblings plus parent dividers go into one flat CellArray; greedy left-to-right pack, then a second RIGHT-to-LEFT pass moves cells back "while would_not_improve_balance" fails — verbatim (:3947-3957): "This adjustment is more than an optimization. The packing above might be so out of balance as to be illegal. For example, the right-most sibling might be completely empty. This adjustment is not optional."
- **WHERE** balance_non_root :3249; overflow adjustment :3375-3398; two-pass safe update order :4460-4510 quoting SQLite (cells moving left must not read from pages already rewritten); root-collapse defragment note :4790-4830 ("the parent [page 1] will be smaller than the child due to the database header").
- **WHY** The right-pass prevents an ILLEGAL state (empty rightmost sibling = fanout violation), not just ugliness. The OVERFLOW CELL ADJUSTMENT exists because drop_cell() physically shifts cell pointers left while insert_into_cell() stores overflow cells VIRTUALLY: "[divider] 3 is actually physically located at index 2. So IF the parent has an overflow cell, we need to subtract 1" — without it, sibling loads read the wrong child pointer.
- **LESSON** Greedy packing needs a legality-REPAIR pass, not just an optimization pass — encode 'which states are illegal' as explicit post-passes saying so, and document virtual-vs-physical index skew at every conversion site.
- **PROBE** Debug-only post_balance_non_root_validation (~4880-5200) snapshots cells and verifies byte-exact survival + no self/parent-pointing children; property tests prop_insertions_preserve_exact_cell_bytes / prop_defragment_fast_matches_fast (~13930+); SEED-reproducible fuzz drivers.

## P3 — Pin-count discipline as the eviction-safety contract

- **WHO** every long-lived PageRef: cursor traversal stacks, balance state across IO yields, overflow chains, blob caches.
- **WHAT** Pages carry AtomicUsize pin_count; pin>0 blocks eviction. PinGuard RAII pins on construction AND on every Clone, unpins on Drop (:398-430: "Since every Drop will unpin, every clone needs to add to the pin count"). PageStack pins pushes / unpins pops.
- **WHERE** pager.rs:113-124 (nested pins doc + "PageCache::clear evicts pages even if pinned" — deliberate leak protection on error paths); btree.rs:915-925 BlobCellCache comment: "any PageRef kept live across a blob operation MUST be pinned, or the pager can evict it and take its buffer out from under the still-held reference (eviction does buffer.take() regardless of live Arc<Page> refs). Storing a PinGuard… makes an unpinned held page UNREPRESENTABLE rather than a discipline to remember."
- **WHY** The hazard is use-after-eviction: eviction takes the buffer even while Arc<Page> clones exist. Counted pins (not flags) because safety regions NEST (free_page pins across a yielding state machine while allocate_page pins trunk/leaf). try_unpin uses fetch_update returning None at 0 so double-unpin is a detectable no-op.
- **LESSON** When eviction can invalidate outstanding references, make the safe representation a TYPE (PinGuard), not a convention — and use counted pins, because safety regions nest.
- **PROBE** pager tests ~6180-6250 hold pins on all residents and prove reads still succeed over capacity then drain; test_evict_all_unpinned_clean (~5140) exercises the exact hazard.

## P4 — WAL-tag spill protocol: write-pending sentinels and packed (frame, epoch) tags

- **WHAT** A spilled dirty page keeps PAGE_DIRTY + gains PAGE_SPILLED (evictable). One u64 wal_tag packs 44-bit frame number + 20-bit checkpoint epoch; TAG_UNSET (=u64::MAX) and TAG_WRITE_PENDING (=MAX−1) bracket the write lifecycle. set_dirty() clears both.
- **WHERE** sentinels :703-706 ("set before starting a WAL write so we can detect if page was modified during the write"); bit layout :708-731 (EPOCH_BITS=20, "max: 1048576"); set_dirty :807-816; is_valid_for_checkpoint :984-996 (frame==target && seq==epoch && !dirty && loaded && !locked); spill arms :3810-4005 (mark spilled only if has_wal_tag else log "modified during write"; warn "all were modified during write").
- **WHY** Core hazard: async WAL write of P in flight while the btree mutates P again. Blindly stamping the frame tag on completion would call the NEWER memory version durable → lost writes. Hence write_pending BEFORE issuing IO and try_set_wal_tag REFUSING to stamp when the tag became UNSET mid-write. The epoch exists because checkpoint_seq rotates generations — a stale frame number must never satisfy a checkpoint.
- **LESSON** For async write-back caches, pair a write-in-flight sentinel with compare-on-completion so concurrent mutation downgrades to "retry later" instead of false durability — and pack generation+position into one atomically-swapped word.
- **PROBE** arm_spill_yield_on_read + SpillYieldHook (:1450-1487) inject deterministic yields; process_overflow_read_survives_spill_yield_from_next_chain_read (~11950) asserts byte-exact reconstruction across them.

## P5 — Commit durability ordering: fsync barrier against partial-write resubmission, deferred auto-checkpoint

- **WHAT** An 8-state commit pipeline (PrepareWal → PrepareWalSync → GetDbSize → ScanAndIssueReads → WaitBatchedReads → PrepareFrames → WaitWrites → WaitSync → WalCommitDone → AutoCheckpoint): collect dirty pages (re-reading evicted ones FROM THE WAL), prepare frames in IOV_MAX batches chained by offset, one writev batch, fsync, THEN publish WAL metadata — auto-checkpoint deliberately split out.
- **WHERE** CommitState docs :660-700 (WaitSync skipped only when clean/non-FULL; AutoCheckpoint "decoupled from commit - checkpoint failure does not affect commit durability"); VERBATIM barrier rationale :4351-4358 ("a partial write may cause an IO backend to resubmit the write (particularly io_uring)… the only way to ensure durability… is to ensure the pwritev completes before the fsync is submitted"); sync-error surfacing :4230-4245 ("Otherwise we would silently drop the failure… and later trip the page-buffer-not-loaded panic"); single-fsync invariant assert :4360-4375 (+ panic on fsync error when data_sync_retry=off, mirroring SQLite); checkpoint split rationale :2830-2870.
- **LESSON** Durability is an ORDERING property, not an IO property: enumerate every way an async backend can reorder/resubmit, place exactly one fsync between "bytes written" and "metadata published", and assert the invariant (≤1 in-flight fsync) in code.
- **PROBE** checkpoint_db_sync_completion_still_leaves_backfill_unpublished_until_proof_install (~6640-6740): paused post-sync gap asserts nbackfills stays 0 until the durable proof installs.

## P6 — Soft-limit page cache with single-flight pending reads

- **WHAT** Capacity is advisory: when full and nothing is evictable, admit OVER capacity rather than failing ("mirroring SQLite, where cache_size may be exceeded while all pages are in use", :3405-3412). pending_reads memoizes (page, disk-read) pairs so a spill-yielded read RESUMES without duplicate IO — "Each Some(page_idx) corresponds to a single outstanding disk read; removed exactly when this method returns Done" (:3300-3310). In-flight cache hits YIELD instead of returning locked/unloaded pages (:3330-3345: otherwise "a torn / uninitialized read, or a concurrent writer filling the buffer underneath the reader").
- **WHY** Three fenced failure modes: pressure turning into user-visible Busy; doubled IO racing the first completion into the same buffer; torn reads from handing out unloaded pages. Documented gap: allocate_page FIXME lacks SQLite's 'nearby' locality hint → freelist fragmentation vs same-region allocation (:5412-5416).
- **LESSON** Treat cache limits as pressure signals, not walls — but pair softness with strict single-flight bookkeeping (one outstanding IO per key, removed exactly at Done) so degradation never becomes duplication or torn reads.
- **PROBE** read_page_nonblock_reentry_reuses_pending_entry asserts Arc::ptr_eq reuse (no-duplicate-IO invariant) + entry removal; inflight-cache-hit test asserts yield-not-done.
