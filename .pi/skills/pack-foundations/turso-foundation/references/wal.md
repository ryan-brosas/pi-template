# Turso — WAL Reference

Complete source-grounded reference (walked in full) for the write-ahead log in `core/storage/wal.rs` (10,620 lines incl. test module), and the frame codec in `core/storage/sqlite3_ondisk.rs`.

Complete source-grounded reference for turso's write-ahead log. Files: `core/storage/wal.rs` (10,620 lines, walked in full including the test module) and the frame codec in `core/storage/sqlite3_ondisk.rs`. The format is deliberately **byte-compatible with SQLite's WAL** — a rusqlite-created `-wal` file opens cleanly.

## Frame format: a checksum chain seeded per generation

A frame is 24 bytes of header (the codec lives in `core/storage/sqlite3_ondisk.rs`; the writer side in `core/storage/wal.rs`) — (six big-endian u32s: page_number, db_size, salt_1, salt_2, checksum_1, checksum_2) followed by the page body. Constants live at sqlite3_ondisk.rs:412-417 (`WAL_HEADER_SIZE = 32`, `WAL_FRAME_HEADER_SIZE = 24`, `WAL_MAGIC_LE = 0x377f0682`, with `BE = LE | 1`).

The integrity story is a **cumulative Fibonacci-weighted checksum**: each frame's checksum covers `x[0..8]` then the page body, seeded with the previous frame's value, forming one unbroken chain from the 32-byte header:

> "s0 += x(i) + s1; s1 += x(i+1) + s0" — and "The checksum values are always stored in the frame header in a big-endian format regardless of which byte order is used." (sqlite3_ondisk.rs:2190-2235)

One rule prevents a subtle corruption across restarts — generation seeding (wal.rs:4801-4830):

> "if next_frame_id == 1 { rolling_checksum = (header.checksum_1, header.checksum_2); } … The first frame of a generation always chains from the WAL header checksum, like SQLite's walFrames at mxFrame == 0."

A checksum captured before a RESTART/TRUNCATE would predate the new header; frame 1 must seed from the synced header instead, because "a savepoint rollback can reinstall a position captured in that window."

Three properties fall out of this design: torn or garbage tails are detectable at exactly the first bad frame (recovery self-terminates there); salts bind frames to a specific WAL generation so stale frames are rejected rather than resurrected; and `db_size > 0` marks commit frames (sqlite3_ondisk.rs:507-509) so recovery never exposes a partial transaction.

**Probe:** `read_wal_header` (wal.rs:~10060) parses raw bytes off disk asserting magic, file_format 3007000, page_size 4096, checkpoint_seq==1 after TRUNCATE; codec round-trips at ~6570-6640 assert byte-exact decode of XOR-codec frames and rejection of wrong buffer sizes.

## Commit ordering: prepare → durable write → publish

The commit path is a three-phase protocol (wal.rs:4790-4930):

1. **prepare_frames** serializes pages and computes checksums *without touching shared WAL state*;
2. the caller writes and fsyncs;
3. **commit_prepared_frames** (:4935-4955) advances max_frame/last_checksum and populates page→frame cache entries — which is what makes frames VISIBLE.

> "populating it here -- from the write completion callback -- is what publishes the frames. Doing it before durability would let a reader or a checkpoint pick up a frame whose bytes are not on disk yet." (wal.rs:~5060-5085)

The spill path differs on purpose: `append_frames_vectored` appends optimistically for cacheflush, and its safety doc (:4960-4965) warns it "should only be used for cacheflush/spilling — the commit path should use prepare_frames + commit_prepared_frames instead." Its optimistic cursor advance is explicitly non-durable bookkeeping (:5090-5115): "if the write fails the transaction unwinds and rollback() restores max_frame / last_checksum." One assert guards the local-vs-authority chain branch (:4840-4870): "connection WAL position must not be behind the committed high-water mark."

Blocking inside spill is also forbidden: "Must NOT block for durability here… A synchronous drain would deadlock a caller that drives I/O from a single-threaded event loop."

**Lesson:** separate optimistic private cursors from globally visible publication points — and make the I/O completion callback, not the submitter, the only place visibility is granted.

**Probe:** wal.rs:~6415-6450 — after a spill append, `get_max_frame()==1` while shared-visible `get_max_frame_in_wal()==0`, and the next prepare assigns frame_id 2; failure injection at ~6640 asserts a failed prepare leaves max_frame==0 and `find_frame(43)==None`.

## Recovery: prove what is trustworthy, discard the rest

Opening a database with an existing `-wal` runs `BuildSharedWal` (sqlite3_ondisk.rs:1450-1955): a poll-driven state machine (NeedHeaderRead → AwaitHeader → ChunkLoop → AwaitChunk → Done) over a StreamingWalReader. It validates the header, reads ~16MB chunks — frame-aligned (`BASE / frame_size * frame_size`) so no frame splits across a read boundary — verifies per-frame salts and the cumulative checksum, buffers pending page→frame entries, and flushes them into the shared cache ONLY when a commit frame arrives:

> "Only include frames up to last valid commit." / finalize uses "checksum of last valid commit frame, not necessarily the last frame." (:1886-1903, :1917-1955)

Stop conditions are logged verbatim: "unexpected page_no, stop reading WAL", "salt mismatch, stop reading WAL", "checksum mismatch, stop reading WAL" — plus a liveness guard, "No forward progress -- treat as end of valid log."

In multi-process (host_shared) mode, a persisted authority snapshot is validated against the actual WAL first (`classify_authority_snapshot_against_wal`, :5602-5720), with enumerated rebuild reasons: WalHeaderUnreadable, WalHeaderMismatch, WalLengthMismatch, WalTooShortForSnapshot, LastFrameMissing, LastFrameNotCommit, LastFrameSaltMismatch, LastFrameChecksumMismatch.

One hole got closed by a regression comment (:1905-1913): recovery populates the frame cache DIRECTLY rather than via cache_frame, so it must seed the rewind-detector high-water mark itself — otherwise the first post-recovery slot reuse goes undetected and find_frame returns a slot now holding a different page, "surfacing as 'non-index page' / 'Invalid page type' / corruption."

**Lesson:** recovery is not "read what is there" but "prove what is trustworthy, then discard the rest at the first broken link" — and every cache populated outside the normal write path must still satisfy that path's invariants (seed your watermarks).

**Probe:** ~8285 truncates ONE byte off the WAL and asserts RebuildFromDisk(WalLengthMismatch); zeroed header → WalHeaderUnreadable; end-to-end ~8540 asserts rebuilt max_frame==1, correct last_checksum, loaded_from_disk_scan=true, frame_cache contains 7→[1].

## Checkpointing: locks held until the last durable fact publishes

Checkpointing runs a five-state machine — Start → SyncWal → Processing → DetermineResult → Finalize — under ordered exclusive locks (CHECKPOINTER, then WRITER + read-mark 0 for Full/Restart/Truncate; order documented :3105-3112). Three ordering decisions carry the correctness:

1. **WAL fsync BEFORE backfill** (SyncWal doc :2405-2422): "Under synchronous=NORMAL commits do not fsync the WAL, so without this durability barrier a crash mid-backfill could persist some backfilled DB pages while recovery drops the unsynced WAL tail, leaving a torn database that matches no committed prefix." The barrier is issued after the frame range is fixed under the locks, so it covers exactly the frames being copied.
2. **mxSafeFrame clamping** (:5130-5160, porting sqlite wal.c): "A checkpoint must never overwrite a page in the main DB file if some active reader might still need to read that page from the WAL." Readers hold shared locks on their read-mark slots; the checkpointer only lowers FREE slots' values.
3. **Truncation deferred past DB sync** (:5062-5068): "For TRUNCATE mode, WAL truncation is NOT done here. It is deferred to pager.rs after the DB file has been synced… if a crash occurs after WAL truncation but before DB sync, the data would be lost." The checkpoint guard survives Finalize so no writer restarts the generation between DB-sync and nbackfills publication (:5085-5090).

Processing pipelines reads (≤ MAX_INFLIGHT_READS=512) into vectored writes with run-merging (WriteBatch tracks contiguous page-id runs via neighbor probes) and flush heuristics (flush when full, or len≥512 AND avg_run≥32, or drained). Reads are ordered by frame id, writes by page id: "the more consecutive page IDs we submit together, the fewer overall write/writev syscalls." A stuck guard errors with "checkpoint stuck: no inflight completions but not complete" instead of hanging.

Auto-checkpoint fires when `max_frame > checkpoint_threshold + nbackfills` (threshold default 1000).

**Lesson:** durability ordering is the whole game in WAL maintenance — sync the log before copying from it, sync the database before shrinking the log, and keep the mutexes until the last durable fact is published.

**Probe:** ~9770-9825 runs two readers at different snapshots and asserts Passive backfills exactly r1's max frame while r2 keeps reading; ~10310 asserts a Busy FULL checkpoint leaves nbackfills==0 ("must not publish positive nbackfills before DB sync") and the rerun backfills from scratch; ~9930 asserts TRUNCATE leaves size 0 with checkpoint_seq==1.

## Snapshot isolation: read-mark slots

Readers take a WalSnapshot {max_frame, nbackfills, last_checksum, checkpoint_seq, transaction_count}. If everything is backfilled (max_frame==nbackfills) they take **slot 0** and ignore the WAL entirely — the steady-state fast path that also lets RESTART proceed once readers drain. Otherwise they claim one of slots 1-4, exclusive-CASing its value to max_frame, then RE-validate the snapshot after locking (:997-1055).

The slot machinery ports SQLite's own commentary verbatim (:2800-2860): readers holding READ_LOCK(0) "always ignore the entire WAL"; "the checkpointer may only transfer frames where the frame numbers are ≤ every aReadMark[] in use." The lock word itself packs writer bit | 31 reader bits | 32-bit value into one u64 — "updated atomically together while sitting in a single cpu cache line" (:230-330).

Contention behavior mirrors SQLite exactly (:3355-3395): yields for retries 6-9, quadratic backoff `(cnt-9)² × 39µs` after that, hard failure at 100. And the upgrade path distinguishes its error: a stale snapshot during read→write upgrade returns **BusySnapshot**, not Busy — "Retrying with busy_timeout will NEVER HELP" (:3405-3430). Savepoint rollback restores (frame, checksum, checkpoint_seq) captured in RollbackTo and ASSERTS generation match — turso needs none of SQLite's cross-checkpoint clamping because positions are only ever captured under the held write lock (:4520-4555).

MVCC consumes these marks too: `min_pinned_read_frame` feeds version-store GC floors (see mvcc.md).

**Lesson:** encode snapshot bounds as values protected by their own locks, so readers, writers, and maintenance coordinate through data rather than conversations.

**Probe:** ~10145-10205 asserts slot-0 behavior after full backfill (find_frame → None since all content is in the DB file); ~9330-9365 forces the Retry path by occupying all four slots and asserts no leaked guard or slot.

## The constants block (honest debt included)

wal.rs:2424-2433 is worth reading as a unit:

```rust
// IOV_MAX is 1024 on most systems, lets use 512 to be safe
pub const CKPT_BATCH_PAGES: usize = 512;
/// TODO: *ALL* of these need to be tuned for perf. It is tricky
/// trying to figure out the ideal numbers here to work together concurrently
const MIN_AVG_RUN_FOR_FLUSH: f32 = 32.0;
const MIN_BATCH_LEN_FOR_FLUSH: usize = 512;
const MAX_INFLIGHT_WRITES: usize = 64;
pub const MAX_INFLIGHT_READS: usize = 512;
pub const IOV_MAX: usize = 1024;
```

Every number trades a named failure for throughput: IOV headroom avoids EINVAL on differing platforms; inflight caps bound queue depth so a huge checkpoint cannot monopolize the IO lane; the run-length heuristic avoids tiny scattered writev's yet stays prompt on drain; frame-aligned 16MB recovery chunks amortize syscalls without splitting frames. Appends assert `pages.len() <= IOV_MAX`. The TODO is itself documentation — an admission of where the tuning levers live.

**Lesson:** pin every concurrency budget to a named constant beside the comment explaining the failure it prevents — and admit loudly (TODO) when a number is a guess.

**Probe:** ~10210-10240 asserts FULL backfill equals mx_before; ~9840-9925 asserts incremental passive checkpoints sum to r2's frame with row counts preserved.

## Verification

The test module inside `core/storage/wal.rs` covers all pillars: `test_wal_concurrent_readers_during_checkpoint` pins read-mark clamping, `test_wal_full_waits_for_old_reader_then_succeeds` pins nbackfills ordering, `test_checkpoint_truncate_reset_handling` pins deferred truncation, `page_codec_round_trips_raw_wal_frames` round-trips the frame format, and `test_classify_authority_snapshot_marks_truncated_wal_for_rebuild` pins recovery classification. `test_read_retry_does_not_leak_vacuum_guard_or_block_vacuum` forces the retry path by occupying all four read-mark slots.
