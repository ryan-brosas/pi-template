# Turso — B-tree & Pager Reference

Complete source-grounded reference for turso's storage layer. Files: `core/storage/btree.rs` (14,335 lines) and `core/storage/pager.rs` (6,870 lines), both read in full.

## Balancing: proven bounds and an append fast path

On overflow or underflow, turso ports SQLite's sibling rebalancing rather than naive page splits: up to `MAX_SIBLING_PAGES_TO_BALANCE = 3` adjacent pages are gathered under one parent and redistributed into at most `MAX_NEW_SIBLING_PAGES_AFTER_BALANCE = 5` pages (constants at btree.rs:144-150). The bound is not arbitrary:

> "We only need maximum 5 pages to balance 3 pages, because we can guarantee that cells from 3 pages will fit in 5 pages." (:149)

and it is ENFORCED — an assert at :3862 ("it is corrupt to require more than 5 pages to balance 3 siblings") turns a violation into corruption detection instead of a fixed-array overflow.

Balancing is not run on every write. It triggers on overflow insertion, or after overwrite/delete when the page drops below ~2/3 full (`free_space * 3 > usable_space * 2`, :2998 and :6810-6827) — with a documented honesty note that this is "a naive algorithm that doesn't try to distribute cells evenly by content… Sqlite tries to have a page at least 40% full" (:3039-3041). An already-balanced gate cites sqlite btree.c#L9064-L9071 before any work starts.

The dominant real workload — sequential rowid appends — gets its own path. `balance_quick` fires only when ALL of these hold (:3104-3168): table leaf, exactly one overflow cell, that cell is last, parent isn't page 1, leaf is the parent's rightmost child. It allocates one new rightmost leaf and inserts a divider no longer than 13 bytes (4-byte page pointer + max 9-byte varint rowid).

The cursor saves its seek key before any balancing because rebalancing invalidates position, and re-seeks afterward.

**Lesson:** bound the blast radius of rebalancing structurally (3→5 pages, asserted), and special-case the common pattern (append) before running the general algorithm — the general path then only handles rare cases, and its invariants become checkable.

**Probe:** `test_delete_balancing` (~12480) inserts 10k rows, deletes keys 500..=3500 to force underfull pages through the full balancing path, then asserts survivor/deleted key sets plus recursive validate_btree(); appends splitting the rightmost leaf via balance_quick are exercised around :13660.

## Redistribution: greedy packing needs a legality-repair pass

`balance_non_root` (:3249+) collects all cells from up to three siblings plus their parent dividers into one flat CellArray, packs greedily left-to-right… and then does something easy to dismiss as an optimization but which the source insists is mandatory:

> "This adjustment is more than an optimization. The packing above might be so out of balance as to be illegal. For example, the right-most sibling might be completely empty. This adjustment is not optional." (:3947-3957)

A second right-to-left pass moves cells back while moving more would improve balance — without it you can produce a fanout violation that only surfaces as corruption later.

Two more subtleties live here:

- **OVERFLOW CELL ADJUSTMENT** (:3375-3398): drop_cell() physically shifts cell-pointer slots left while insert_into_cell() stores overflow cells virtually. Consequence, verbatim: "[divider] 3 is actually physically located at index 2. So IF the parent has an overflow cell, we need to subtract 1 to get the actual rightmost divider cell idx." Miss this and sibling loads read the wrong child pointer after InteriorNodeReplacement.
- **Two-pass safe update order** (:4460-4510, quoting SQLite): when cells move left, don't update the target page until the left-hand sibling has been updated — mid-redistribution reads would see rewritten bytes.

Root collapse has its own trap: "It is critical that the child page be defragmented before being copied into the parent, because if the parent is page 1 then it will be smaller than the child due to the database header" (:4790-4830).

Divider construction differs by page type: interior dividers keep payload and repoint the left child; table-leaf dividers reuse the moved rowid; index-leaf dividers prepend the new page id to the stripped key. Page numbers are reassigned in sorted order so physical file order matches logical order.

**Lesson:** greedy packing needs a legality-REPAIR pass, not just an optimization pass — encode 'which states are illegal' as explicit post-passes with comments saying so, and document virtual-vs-physical index skew wherever code converts between them.

**Probe:** debug builds run post_balance_non_root_validation (~4880-5200): snapshot every cell before redistribution, verify byte-exact survival, no self/parent-pointing children, every new page reachable from a divider or rightmost pointer. Property tests prop_insertions_preserve_exact_cell_bytes / prop_defragment_fast_matches_full (~13930+) check freeblock ordering and compute_free_space accounting; fuzz drivers take a SEED env for reproducibility.

## Pin discipline: making unsafe states unrepresentable

Pages carry an AtomicUsize pin count; pin > 0 makes a page ineligible for cache eviction. The wrapper type is load-bearing by design (btree.rs:915-925):

> "any PageRef kept live across a blob operation MUST be pinned, or the pager can evict it and take its buffer out from under the still-held reference (eviction does buffer.take() regardless of live Arc<Page> refs). Storing a PinGuard … makes an unpinned held page unrepresentable rather than a discipline to remember."

Counted pins, not boolean flags, because safety regions NEST: free_page pins the freed page across a state machine that may yield while allocate_page separately pins trunk/leaf pages — a flag would let an inner unpin release a page an outer path still holds. PinGuard pins on construction AND on every Clone ("Since every Drop will unpin, every clone needs to add to the pin count", :398-430); unpin uses fetch_update returning None at zero so double-unpin is a detectable no-op (pager.rs:962-975).

One deliberate exception is documented at pager.rs:113-124: `PageCache::clear` evicts even pinned pages — error paths always clear the cache, trading warmth for guaranteed pin-boundedness (pins can't leak past a reset). PageStack takes its slots on clear for the same reason: "a leftover Some(page) after a clear could otherwise be unpinned again on the next reset, decrementing the pin count of a page another cursor's stack still relies on."

**Lesson:** when eviction can invalidate outstanding references, make the safe representation a TYPE (PinGuard), not a convention — and use counted pins, not flags, because safety regions nest.

**Probe:** pager tests ~6180-6250 hold strong refs (pins) on all resident pages and prove reads/allocations still succeed by admitting over capacity, draining once refs drop; test_evict_all_unpinned_clean (~5140) evicts clean unpinned pages while a cursor holds a PageRef — the exact hazard PinGuard prevents.

## Spill tags: async write-back vs concurrent mutation

When cache pressure spills a dirty page into the WAL, the page keeps PAGE_DIRTY and gains PAGE_SPILLED — now evictable. Each page records WHICH WAL frame version it holds in a single u64 `wal_tag`, packing a 44-bit frame number and 20-bit checkpoint epoch (EPOCH_BITS=20, "max: 1048576", :708-731), bracketed by two sentinels: TAG_UNSET (=u64::MAX) and TAG_WRITE_PENDING (=MAX−1) — "set before starting a WAL write so we can detect if page was modified during the write" (:703-706).

The hazard this kills: an async WAL write of page P is in flight while the btree mutates P again. If the completion blindly stamped the new frame tag and cleared dirty, the newer in-memory version would be considered durable and the page evictable — lost writes. So spill marks all victims TAG_WRITE_PENDING BEFORE issuing IO (:3965-4005); on completion, only pages whose tag survived get marked spilled (:3810+ logs "page {} modified during write, not marking as spilled" and warns when NOTHING survived). set_dirty() clears tag and spilled flag together — "Clear spilled flag since page is being modified again" (:807-816).

The epoch bits exist because checkpoint_seq rotates WAL generations: a stale frame number from a previous generation must never satisfy a checkpoint. Commit-time verification (`is_valid_for_checkpoint`, :984-996) requires frame==target && epoch==current && !dirty && loaded && !locked.

**Lesson:** for async write-back caches, pair a write-in-flight sentinel with compare-on-completion so concurrent mutation downgrades to "retry later" instead of false durability — and pack generation + position into one atomically-swapped word.

**Probe:** arm_spill_yield_on_read + SpillYieldHook (:1450-1487) inject deterministic yields; process_overflow_read_survives_spill_yield_from_next_chain_read (~11950) asserts byte-exact record reconstruction across an injected chain-read yield.

## Durability ordering: one fsync between bytes and metadata

Commit runs an eight-state pipeline ending WaitWrites → WaitSync → WalCommitDone → AutoCheckpoint. The barrier rationale is quoted verbatim at pager.rs:4351-4358:

> "To protect against partial writes, we MUST ensure that all write Completions finish before submitting the fsync. It is possible that a partial write will cause an IO backend to resubmit the write (particularly with io_uring) and we cannot have the fsync submitted before all writes are fully done, even if they are IO_LINK'd together or we submit the fsync with IO_DRAIN, the only way to ensure durability in the case of partial writes is to ensure the pwritev completes before the fsync is submitted."

Around it, two guards kill adjacent bugs: synchronous read errors on evicted dirty pages surface immediately ("Otherwise we would silently drop the failure… and later trip the page-buffer-not-loaded panic", :4230-4245), and WaitSync asserts at most one in-flight fsync (:4360-4375) — panicking on fsync error when data_sync_retry=off, mirroring SQLite's refusal to continue after ambiguous sync failures. Publishing WAL metadata happens strictly AFTER fsync success, so recovery never replays a commit whose bytes aren't durable.

Auto-checkpoint is deliberately OUTSIDE the transaction (:2830-2870): "checkpoint failure does not affect commit durability", and separation lets the checkpointer backfill through the just-committed frames and still perform a WAL restart.

**Lesson:** durability is an ORDERING property, not an IO property — enumerate every way an async backend can reorder or resubmit, place exactly one fsync between "bytes written" and "metadata published," and assert the invariant (≤1 in-flight fsync) in code.

**Probe:** checkpoint_db_sync_completion_still_leaves_backfill_unpublished_until_proof_install (~6640-6740) pauses the state machine in the post-sync gap and asserts nbackfills stays 0 until the durable proof installs — DB-file sync alone never publishes progress.

## Page cache: soft limits + single-flight reads

Cache capacity is advisory. When full with nothing spillable or evictable, the new page is admitted OVER capacity:

> "The cache capacity is a soft limit: if nothing can be spilled or evicted, the page is admitted over capacity rather than failing the read (mirroring SQLite, where cache_size may be exceeded while all pages are in use); later inserts drain the excess." (:3405-3412)

Softness is safe because of strict single-flight bookkeeping: pending_reads memoizes (page, disk-read Completion) pairs for reads whose cache_insert was blocked by an in-flight spill — "Each Some(page_idx) mapping corresponds to a single outstanding disk read; the entry is removed exactly when this method returns Done" (:3300-3310). Re-entry reuses the stored pair instead of issuing a second disk read that would race the first completion writing into the same buffer.

And a locked-but-unloaded cache hit YIELDS rather than returning: handing a caller such a page means "a torn / uninitialized read, or a concurrent writer filling the buffer underneath the reader" (:3330-3345). Rollback clears pending_reads so abandoned reads can't leak entries.

One honest gap is documented as a FIXME (:5412-5416): allocate_page hasn't implemented SQLite's 'nearby' locality parameter — freelist reuse currently fragments range scans versus same-region allocation.

**Lesson:** treat cache limits as pressure signals, not walls — but pair softness with single-flight bookkeeping so degradation never becomes duplication or torn reads.

**Probe:** read_page_nonblock_reentry_reuses_pending_entry asserts Arc::ptr_eq reuse of the memoized read (the no-duplicate-IO invariant) plus entry removal; read_page_nonblock_inflight_cache_hit_yields_not_done plants a locked/unloaded page and asserts yield-not-done.
