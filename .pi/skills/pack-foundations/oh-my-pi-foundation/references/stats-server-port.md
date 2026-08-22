<!-- capsule-v1 -->
# Stats dashboard server - aggregator routes + identity-first port reuse

**Source:** Oh My Pi `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/stats/src/server.ts`, `port-conflict.ts`.

## Server face: read projections plus explicit sync
**Path/Symbol:** `server.ts:handleApi`, `startServer`, `formatStatsDashboardUrl`; dashboard readers from `./aggregator`, and `getGainDashboardStats` from `./gain-aggregator`.
**Signature:** `handleApi(req): Promise<Response>`; `startServer(port = 3847, hostname = STATS_DASHBOARD_HOSTNAME): Promise<{ hostname, port, stop }>`.
**Data Shape:** source builds use `CLIENT_DIR` and `STATIC_DIR`; `decodeEmbeddedClientArchive(embeddedClientArchiveTxt)` provides the embedded archive. `IS_PREBUILT` covers compiled or bundled runs, and `USE_EMBEDDED_CLIENT` is true whenever that archive exists or a prebuilt runtime requires it.

### Decisive source
```ts
if (path === "/api/stats/providers") return Response.json(await getProviderDashboardStats(range));
if (path === "/api/stats/gain") return Response.json(await getGainDashboardStats(range, project));
if (path === "/api/sync") {
  const result = await syncAllSessions();
  const count = await getTotalMessageCount();
  return Response.json({ ...result, totalMessages: count });
}
```

**Flow:** stats, overview, model, cost, behavior, tool, provider, request, error, and gain routes are projections over their aggregators. `/api/sync` is deliberately different: it performs the expensive session scan before returning its count. Static assets come from the embedded archive when available/prebuilt; otherwise `ensureClientBuild` maintains the source-build client.

**Invariant:** ordinary dashboard reads do not trigger session ingestion; only `/api/sync` does. Every dashboard response carries the identity and requested-host headers, including errors and `OPTIONS` responses.

**Probe:** `test/server-port-conflict.test.ts` starts the dashboard and verifies headers, bind scope, reuse, reclamation, and refusal to stop foreign listeners; `test/errors-route-range.test.tsx` covers error-route ranges.

## Port conflict: reuse a verified dashboard, reclaim only a verified owner
**Path/Symbol:** `port-conflict.ts:prepareStatsPort`, `recoverStatsPort`, `probeStatsDashboard`, `reclaimStatsPort`; `STATS_DASHBOARD_HEADER`, `STATS_DASHBOARD_HOSTNAME_HEADER`, `STATS_DASHBOARD_SECURITY_VERSION`, `STATS_DASHBOARD_HOSTNAME`.
**Signature:** `prepareStatsPort(port, hostname?): Promise<"retry" | "reuse">`; `recoverStatsPort(port, hostname?): Promise<"retry" | "reuse">`.
**Data Shape:** probe state is `"reusable" | "occupied" | "unreachable"`; holders carry `{ pid, image, commandLine }`; runtime-image allowlist is `{ bun, node, omp, "omp-stats" }` and the probe timeout is 500 ms.

### Decisive source
```ts
const reusable = response.status === 200 &&
  response.headers.get(STATS_DASHBOARD_HEADER) === STATS_DASHBOARD_SECURITY_VERSION &&
  response.headers.get(STATS_DASHBOARD_HOSTNAME_HEADER) === hostname &&
  !response.headers.has("Access-Control-Allow-Origin");
if (probe === "reusable") return "reuse";
if (probe === "occupied") return reclaimStatsPort(port);
return "retry";
```

**Flow:** `startServer` preflights a nonzero port. A correctly stamped, same-host, no-CORS dashboard is reused; an occupied or post-bind-conflict port is examined for a known OMP stats owner. `reclaimStatsPort` refuses to stop a foreign process, but terminates a verified stats listener and returns `retry` so the same port is bound again.

**Invariant:** a port number alone is never identity. Reuse requires the matching security version and requested host; reclamation additionally requires a recognizable OMP stats process, so a foreign 200 responder remains running.

**Probe:** `test/server-port-conflict.test.ts` asserts reusable, legacy-reclaim, unresponsive-owner, and foreign-listener cases.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(handleApi|startServer|prepareStatsPort|recoverStatsPort)$", limit: 8, fields: ["signature"] });
```
