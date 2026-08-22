<!-- capsule-v1 -->
# Mnemonic temporal recall + feature gates - deterministic time, explicit opt-in

**Source:** Oh My Pi `main@96f428097`; Codebase Memory project `oh-my-pi` (code-grounded, reactors graph-covered). **Path:** `packages/mnemopi/src/core/temporal-parser.ts`, `core/beam/recall.ts`, `config.ts`.

## Temporal parser: deterministic relative and absolute dates
**Path/Symbol:** `temporal-parser.ts:parseNlDate`, `extractTemporal`, `extractDateFromText`, `resolveRelativeDay`; `beam/recall.ts:parseQueryTime`, `temporalBoost`.
**Signature:** `parseNlDate(text, reference?): ParsedNaturalDate | null`; `extractTemporal(text, reference?): TemporalInfo`; `extractDateFromText(text, reference?): string | null`; `temporalBoost(timestamp, queryTime, halfLifeHours): number`.
**Data Shape:** `ParsedNaturalDate = [eventDate: Date, precision: Exclude<DatePrecision,"unknown">, temporalTags: string[]]`; `TemporalInfo { event_date: string|null, event_date_precision: "day"|"week"|"month"|"year"|"relative"|"unknown", temporal_tags: string[], primary_signal: string|null }`. UTC-normalized reference-time resolution keeps the parser deterministic.

### Decisive source
```ts
export function parseNlDate(text, reference?) {
  // resolves relative days/week/month/year, intervals, named times,
  // and vague recency against a UTC-normalized reference
  return [d, precision, tags];
}
```

**Flow:** parsing normalizes the caller-supplied or default reference to UTC and resolves explicit dates, relative weekdays, `n` day/week/month/year intervals (past and future), named dayparts (`morning`…`dusk`), and vague markers (`recently`, `a while ago`). Recap calls apply `temporalBoost` to rerank existing candidates; a future timestamp clamps to the newest value rather than erroring.

**Invariant:** the parser is deterministic for a supplied reference; no recognized phrase yields `unknown` precision with a null date. Evidence tags and numeric `primary_signal` are separate: temporal scoring never adds or removes recall candidates — it only adjusts their rank.

**Probe:** `test/temporal-parser.test.ts` pins parsing, boundaries, tags, and UTC; `test/temporal-recall.test.ts` pins `temporalBoost` decay, invalid/future timestamps, and rank-only effects.

## Feature gates: host defaults with env override
**Path/Symbol:** `config.ts:configureRecallFeatures`, `enhancedRecallEnabled`, `polyphonicRecallEnabled`, `proactiveLinkingEnabled`, `temporalHalflifeHours`.
**Signature:** `configureRecallFeatures(flags: RecallFeatureFlags): void`; gate functions accept `env = process.env` and return `boolean`.
**Data Shape:** `RecallFeatureFlags { polyphonicRecall?, enhancedRecall?, proactiveLinking? }`; gates default off; env vars `MNEMOPI_POLYPHONIC_RECALL`, `MNEMOPI_ENHANCED_RECALL`, `MNEMOPI_PROACTIVE_LINKING`, `MNEMOPI_TEMPORAL_HALFLIFE_HOURS` (default 24) override host defaults in both directions.

### Decisive source
```ts
const value = envOptionalString("MNEMOPI_ENHANCED_RECALL", env);
return value === undefined ? enhancedRecallDefault : value === "1";
```

**Flow:** host configuration (`configureRecallFeatures`) sets only supplied process-wide defaults; each read resolves the current env, and `"0"`/`"1"` override in both directions. All recall gates default off; the temporal half-life configures the scoring algorithm.

**Invariant:** gates are explicit opt-in and never silently widen behavior. Env `"0"` disables a host-enabled feature; config never flips a feature back on once an env var pins it.

**Probe:** `test/recall-feature-flags.test.ts` pins default-off, partial updates, and env-over-configured precedence in both directions.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(parseNlDate|extractTemporal|temporalBoost|configureRecallFeatures|enhancedRecallEnabled)$", limit: 5, fields: ["signature"] });
```
