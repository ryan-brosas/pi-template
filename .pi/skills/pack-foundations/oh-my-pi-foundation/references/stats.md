<!-- capsule-v3 -->
# Stats — honest usage, degraded gracefully

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Reference:** packages/stats. **Question:** How do telemetry windows stay truthful when the upstream is down, a fresh install has no history, or the schema predates usage_history?

## Usage windows that degrade instead of failing
**Path/Symbol:** `packages/stats/src/usage-windows.ts:readUsageSnapshots` (72); `packages/stats/src/usage-windows.ts:sumFleetTokens` (177); `stats/src/aggregator.ts:aggregate` and `user-metrics.ts` (pure metric functions).
**Signature:** `readUsageSnapshots(sinceMs, dbPath = getAgentDbPath()): UsageSnapshotRow[]`.
**Data Shape:** `usage_history` rows (recorded_at, provider/account, limit_id, label, used_fraction, status, window_label); broker `ClientUsageClientSummary[]` per-client provider totals.

### Decisive source
```ts
export function readUsageSnapshots(sinceMs: number, dbPath = getAgentDbPath()): UsageSnapshotRow[] {
  let db: Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true });
    db.run("PRAGMA busy_timeout = 5000");
    const rows = db.prepare(`SELECT recorded_at, provider, ..., FROM usage_history WHERE recorded_at >= ? ORDER BY recorded_at ASC`).all(sinceMs);
    return rows.map(r => ({ recordedAt: r.recorded_at, ... }));
  } catch (err) { logger.debug("usage_history unavailable"); return []; }
  finally { db?.close(); }
}
```

**Flow:** readonly open + busy_timeout → select-or-return-before-last-visible-`sinceMs` rows ascending by time → map snake_case DB rows to camelCase TS, catch everything (fresh install, pre-usage schema) and return `[]`. The aggregator composes the window stats: per-column sums, p50/p95/p99 latency, error counts, and used_fraction vs limit. `user-metrics.ts` is a pure per-message linter (yelling/profanity/anguish/negation) usable offline — no DB dependency.

**Invariant:** a missing or unreadable history is a *degradation*, never a throw; stats surfaces must still render past windows.

**Probe:** `packages/stats/test/db-range.test.ts` (getDashboardStats time range) is the canonical range-selection pin; `packages/stats/test/user-metrics.test.ts` pins the pure metric extraction; `stats/test/*.test.ts` under live stats package remains bun-run green at `96f428097`.

## Get live surrounding code

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(readUsageSnapshots|fetchUsageData|aggregate|computeUserMessageMetrics|isExhausted)$", limit: 14, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.stats.src.usage-windows.readUsageSnapshots" });
```
