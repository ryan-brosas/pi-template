<!-- capsule-v1 -->
# Stats ingestion — lock, worker, apply, embedded dashboard

**Source:** `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/stats/src/aggregator.ts` + `sync-worker.ts` + `embedded-client.ts`.

## Sync: one file lock, workers parse, main thread applies
**Path/Symbol:** `packages/stats/src/aggregator.ts:syncAllSessions` / `withStatsSyncLock`; `applyParseResult`.
**Signature:** `withStatsSyncLock(dbPath, fn): Promise<T>` — native file lock `${dbPath}.sync`, retry 25 ms, total wait ≈1h; `syncAllSessions(dbPath, { onProgress, workerCount, force }): Promise<SyncReport>`.
**Data Shape:** `SyncWorkerRequest = { kind?: "parse"; sessionFile; fromOffset } | { kind: "ping" }`; `SyncWorkerResponse = { ok:true; result } | { ok:true; kind:"pong" } | { ok:false; error }`; embedded archive = base64 of gzipped tar (gzip magic 0x1f 0x8b).

### Decisive source (flow, not code)
(1) `withStatsSyncLock` so a parse result can never commit after GC moved a session — native lock, interrupted owners auto-release, live owners never displaced; (2) main discovers session files (`listAllSessionFiles`) + per-file offset DB (`getFileOffset`) → parse only `fromOffset` onward; (3) tasks posted 1:1 to workers via structured clone `{ sessionFile, fromOffset }` — worker runs `parseSessionFile` (pure IO+CPU, NO DB) and posts back the `ParseSessionResult`; (4) the single SQLite handle on the main thread applies via `applyParseResult` — inserts message/user stats, tool calls, links, results, then `setFileOffset`.

**Probe:** worker ping: `{ kind: 'ping' }` → `{ ok: true, kind: 'pong' }` used by `smokeTestSyncWorker` (issue #1011 / PR #1027 — worker must actually spawn in compiled binaries). Tests: `test/smoke-worker*.test.ts`, `test/acceptance*.test.ts`, `test/aggregator.test.ts`.

## No DB in workers — structured-clone contracts
**Path/Symbol:** `sync-worker.ts` types. Request `{ kind?: 'parse'; sessionFile: string; fromOffset: number } | { kind: 'ping' }`; response `{ ok: true, result: ParseSessionResult } | { ok: false, error: string }`.
**Invariant:** a failing parse never wedges the pool — the worker replies `{ok:false,error}` and the main thread records skips + continues.

## Embedded dashboard: gpz archive, magic bit
**Path/Symbol:** `embedded-client.ts:decodeEmbeddedClientArchive(txt): Buffer | null`.

### Decisive source
```ts
const normalized = txt.replaceAll(/\s+/g, '');
if (!normalized) return null;
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return null;
const bytes = Buffer.from(normalized, 'base64');
if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return null; // gzip magic
return bytes;
```

**Flow:** `embedded-client.generated.txt` holds base64 of gzipped tar of `dist/client`; populated by `gen:stats` for compiled binaries + prepacked bundles, reset to empty afterwards so the dev tree builds from source. Decode rejects non-gzip blobs (0x1f 0x8b magic) incl. the legacy `export const …` placeholder — that must be treated as *no archive*, never decoded garbage. Missing/degraded archive → dev build fallback, not a startup failure.

**Probe:** `test/sync-worker.test.ts` (ping/parse), `test/embedded-client.test.ts` (base64/gzip round-trip, empty + placeholder cases).

## Get live

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(withStatsSyncLock|syncAllSessions|applyParseResult|decodeEmbeddedClientArchive|parseSessionFile)$", limit: 14, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.stats.src.aggregator.syncAllSessions" });
```