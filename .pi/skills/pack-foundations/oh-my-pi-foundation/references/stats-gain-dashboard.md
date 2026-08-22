<!-- capsule-v1 -->
# Stats gain-aggregator — savings ledger rendered once

**Source:** `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/stats/src/gain-aggregator.ts`.

**Path/Symbol:** `gain-aggregator.ts:aggregateGainStats` (exports `GainSourceTotals`, `GainTimeSeriesPoint` in `shared-types.ts`); window config reused from `aggregator.ts:getTimeRangeConfig`.
**Signature:** `aggregateGainStats(…): GainDashboardStats`; **Data Shape:** savings source = `snapcompact-savings.jsonl` colocated next to `stats.db`; per-run rows of bytes/tokens (≈4 bytes/token); missing file → zero records, never an error.

### Decisive source
```ts
// Missing files are treated as zero records — never an error.
const TEMP_PATH_RE = /(?:^|\/)(?:tmp|pi-bash-exec|omp-bash-exec|pi-bash-detach)(?:\/|$)/; // temp/internal paths
function matchesProject(cwd, project) { … }  // worktree roots fold to logical project root
```

**Flow:** aggregates per-run savings into per-project totals + daily buckets; temp/internal paths are dropped, nested worktree cwds (like `/repo/.worktrees/lane/src`) collapse onto their logical parent project before bucketing, and the window uses the same `getTimeRangeConfig` as the dashboard. SQLite writes are chunked (500 vars) so one parameterized statement stays bounded.

**Invariant:** a missing ledger reads as zero, never throws; each row contributes to exactly one project bucket after the cwd-fold; nothing past the window is counted.

**Probe:** `test/gain-aggregator.test.ts`, `test/db-cost.test.ts`.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(aggregateGainStats|GainSourceTotals|GainTimeSeriesPoint)$", limit: 6, fields: ["signature"] });
```