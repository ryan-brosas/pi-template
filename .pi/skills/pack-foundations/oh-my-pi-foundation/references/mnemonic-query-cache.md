<!-- capsule-v1 -->
# Mnemonic query cache - tiered recall cache + cost log

**Source:** Oh My Pi `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/mnemopi/src/core/query-cache.ts`, `cost-log.ts`.

## Query cache: exact, semantic, and overlap tiers
**Path/Symbol:** `query-cache.ts:QueryCache.get`, `put`, `invalidate`, `stats`, `isQueryCacheEnabled`, `isEnhancedRecallEnabled`.
**Signature:** `get(query, embedding?): readonly QueryCacheResult[] | null`; `put(query, results, embedding?): void`; `isQueryCacheEnabled(useCache = true, env) = useCache && enhancedRecallEnabled(env)`.
**Data Shape:** `#tier1` and `#tier4` map normalized keys to results; `#tier23` maps a key to `{ embedding, results }`; `#insertTimes` provides TTL and LRU bookkeeping. Optional SQLite rows are `{ normalized, embedding_json, results_json }`; options accept camel- and snake-case database, size, and TTL keys.

### Decisive source
```ts
if (cosine >= 0.88) bestKey = cachedKey;
if (cosine >= 0.78 && jaccard >= 0.15) bestKey = cachedKey;
if (overlap >= queryWords.size * 0.7 && overlap >= 2) return results;
```

**Flow:** `normalize` lowercases, removes one-character words, and sorts the remaining terms. Lookup checks tier1 exact-normalized results first, then tier2 high-cosine matches, tier3 cosine-plus-Jaccard matches, then tier4 word-overlap fallback. `put` owns population and optional persistence; `invalidate` clears every tier, deletes persisted rows, and increments `version`. TTL retains the original insert timestamp while map order supplies LRU eviction at `maxSize`.

**Invariant:** tier1 is exact after normalization; tier2/3 and tier4 intentionally return recall candidates from a related cached key, so consumers must not treat them as exact-answer equivalence. Callers that honor `isQueryCacheEnabled` bypass the cache when the feature flag is disabled.

**Probe:** `test/query-cache-synonyms.test.ts` checks all four tiers, TTL, invalidation, LRU eviction, persistence, stats, and the `MNEMOPI_ENHANCED_RECALL` gate.

## Cost log: durable estimate rows with zero-safe aggregates
**Path/Symbol:** `cost-log.ts:initCostLog`, `logCost`, `getCostStats`, `getConn`.
**Signature:** `logCost(sessionId, memoryCount, tokenCount, estimatedCostUsd, model = "default", dbPath?): void`; `getCostStats(sessionId?, dbPath?): CostStats`.
**Data Shape:** `cost_entries { id, session_id, memory_count, token_count, estimated_cost_usd, model, timestamp }`; `CostStats { total_calls, total_memories_injected, total_tokens, total_estimated_cost_usd }`.

### Decisive source
```ts
INSERT INTO cost_entries (session_id, memory_count, token_count,
  estimated_cost_usd, model, timestamp) VALUES (?, ?, ?, ?, ?, ?)
// aggregation coalesces COUNT/SUM nulls to 0 and rounds USD to six decimals
```

**Flow:** each log call initializes the local SQLite table, inserts one model-cost estimate, and closes its connection. `getCostStats` can aggregate every session or one session; missing rows resolve to zero totals rather than an error.

**Invariant:** `estimated_cost_usd` is a model estimate, not a billing record; per-session filtering cannot leak rows from another session, and an absent session remains zero-valued.

**Probe:** `test/text-utilities.test.ts` initializes the table, writes multiple sessions, and asserts all-session, one-session, and missing-session totals.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(QueryCache|isQueryCacheEnabled|initCostLog|logCost|getCostStats)$", limit: 8, fields: ["signature"] });
```
