<!-- capsule-v1 -->
# Stats dashboard client — bounded, abortable, stale-while-revalidated views

**Source:** Oh My Pi `main@96f428097`; Codebase Memory `oh-my-pi` (code-grounded). **Path:** `packages/stats/src/aggregator.ts`, `client/api.ts`, `client/data/useResource.ts`.

## Provider projection: honest, range-bounded dashboard data
**Path/Symbol:** `aggregator.ts:getProviderDashboardStats`, `computeUsageWindowStats`, `sumFleetTokens`; `client/api.ts:getProviderDashboardStats`, `ApiError`, `fetchJson`.
**Signature:** `getProviderDashboardStats(range?): Promise<ProviderDashboardStats>`; `computeUsageWindowStats(rows, capacity): { usageSeries, windowInsights }`; `sumFleetTokens(clients): Map | null`.
**Data Shape:** provider payload carries per-provider totals, usage series, and window insights (fraction consumed, cycles, est. tokens/window, peak, ideal accounts, exhaustion); fleet tokens remain from remote installs.

### Decisive source
```ts
const res = await fetch(endpoint, options);
if (!res.ok) throw new ApiError(res.status, endpoint, `HTTP error ${res.status} on ${endpoint}`);
return res.json() as Promise<T>;
```

**Flow:** the server initializes its DB, bounds aggregation to the requested range, computes window insights from snapshot deltas, then serves typed projections; the client URL-encodes its range, forwards an `AbortSignal`, and surfaces non-ok HTTP as `ApiError` rather than a hollow payload.

**Invariant:** fleet-token results are null/empty — not faked zero — when no report exists; per-install windows must not be misread as fleet totals. The client never fabricates data a closed dashboard endpoint withheld.

**Probe:** `test/provider-stats.test.ts` covers server projection deltas, resets, per-provider totals, and fleet token inference; the dashboard consumes these typed routes.

## Client data hook: instant cache, cancellable revalidation
**Path/Symbol:** `client/data/useResource.ts:useResource`, `ResourceResult`, `ResourceOptions`.
**Signature:** `useResource<T>(key: readonly unknown[], fetcher, options?): ResourceResult<T>`.
**Data Shape:** `ResourceResult { data, error, loading, refreshing, refetch, updatedAt }`; `ResourceOptions { pollMs?, enabled? }`; an in-memory stale-while-revalidate cache (keyed by serialized key, capped at 64) scoped to the session.

### Decisive source
```ts
const controller = new AbortController();
controllerRef.current = controller;
if (cached) { setData(cached.data as T); executeRefetch(true); }
```

**Flow:** first load shows a skeleton; revisiting a key renders cached data then revalidates in the background; toggling the key aborts the prior request and retunes without unmounting; optional polling when `pollMs` is set.

**Invariant:** an aborted or out-of-order response must never overwrite more recent data; the cache is session-local, ephemeral, disposable — never a durable ledger.

**Probe:** `test/client-view-models.test.ts` and provider-stats test cover the provider projection and its consumption.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(getProviderDashboardStats|useResource|getOverviewStats|sumFleetTokens)$", limit: 5, fields: ["signature"] });
```