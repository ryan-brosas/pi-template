<!-- capsule-v1 -->
# Stats db seams — single-writer ingest, WAL, offsets, time-bucketed reads

**Source:** `main@96e288097`; Codebase Memory `oh-my-pi`. **Path:** `packages/stats/src/db.ts` + `usage-windows.ts`.

## One handle, WAL, schema-capture-before-create
**Path/Symbol:** `packages/stats/src/db.ts:initDb()`; `closeDb`; `getFileOffset`/`setFileOffset`; `insertMessageStats`; `getRecentRequests/Errors`.
**Signature:** `initDb(): Database`; `getFileOffset(sessionFile): number | undefined`; `setFileOffset(sessionFile, offset, lastModified): void`; `getMessageById(id): MessageStats | null`; `getRecentRequests(limit=100)`.
**Data Shape:** SQLite rows `messages`/`user_messages`/`tool_calls` + per-file parse offset; series points `{ t, value[, bucket] }`; readUsageSnapshots → UsageSnapshotRow[] {provider, limitId, accountKey, window…}.

### Decisive source
```ts
PRAGMA busy_timeout = 5000; db.run("PRAGMA journal_mode = WAL");
const messagesTableExisted = /* SELECT … FROM sqlite_master BEFORE CREATE TABLE */;
// one-time agent_type backfill only when the table predates this init
for (const sql of MIGRATIONS) db.exec(sql);
```

**Flow:** a process-wide singleton SQLite instance; WAL so reader queries never block the single writer; `busy_timeout` keeps concurrent readers from failing on a locked writer. The pre-schema `messagesTableExisted` check gates a one-time backfill of `agent_type` on legacy DBs — running the same migration twice is a no-op by construction.

**Invariant:** all schema migration is idempotent; offsets are per-session-file so sync resumes incrementally even after crashes.

## Read side: bucketed series, cutoff clipping
**Path/Symbol:** `getTimeSeries`, `getModelTimeSeries`, `getProviderTimeSeries`, `getProviderHourlyBurn`, `getCostTimeSeries`.
**Signature:** `getTimeSeries(hours=24, cutoff?, bucketMs=1h)`; `getModelTimeSeries(days=14, cutoff?, bucketMs=1d)`; `getProviderTimeSeries(same)`; `getCostTimeSeries(days=90)`.

### Decisive source
```ts
export function getTimeSeries(hours = 24, cutoff?: number | null, bucketMs = 60 * 60 * 1000) { … }
// buckets computed as Math.floor(time / bucketMs) * bucketMs; cutoff refuses to include rows past it
```

**Flow:** series functions accept a `cutoff` UTC-ms timestamp to exclude rows after it, then bucket by `bucketMs`; bucketing is done in SQL arithmetic, not in JS — aggregation stays in the DB. `getCostTimeSeries` defaults to 90 days (daily buckets); provider series default to 14 days.

**Invariant:** time series never fabricates points for empty buckets — callers see gaps, and granularity is chosen by caller, not by aggregation.

## Usage windows and fleet tokens
**Path/Symbol:** `usage-windows.ts:computeUsageWindowStats`, `readUsageSnapshot`, `fetchUsageData`, `sumFleetTokens`.

**Probe:** `test/db-range.test.ts` (offsets/buckets), `test/db-cost.test.ts` (cost series), `test/user-metrics.test.ts`, `test/provider-stats.test.ts`, `test/behavior-backfill.test.ts`, `test/gain-aggregator.test.ts`

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(initDb|getFileOffset|getTimeSeries|computeUsageWindowStats|readUsageSnapshots|sumFleetTokens)$", limit: 10, fields: ["signature"] });
```