<!-- capsule-v1 -->
# Mnemonic recall — signals, tier, fallback chain

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/mnemopi/src/core/beam/recall.ts` + `consolidate.ts` + `types.ts`.

## Recall = fused signals, tier-aware query, never-empty fallback
**Path/Symbol:** `packages/mnemopi/src/core/beam/recall.ts:recall` / `recallEnhanced`; `type CandidateSignals`; `VERACITY_WEIGHTS`; `RECALL_CONTENT_PREVIEW_CHARS = 500`.
**Signature:** `recall(beam, query, topK, opts): Promise<RecallResult[]>` — opts take `temporalWeight`, `vecWeight`, `ftsWeight`, `importanceWeight`, `queryEmbedding`, `useSynonyms/useIntent/useMmr`, `mmrLambda`, `contentPreviewChars`, `updateRecallCounts`, `source/topic/veracity/memoryType` filters.
**Data Shape:** sessions, spans, memory rows with FTS-friendly text columns, vector embeddings (binary/float BLOB), tiers `working|episodic`, veracity labels with weights (`stated:1.0 … tool:0.5 false:0`).

### Decisive source
```ts
const signals: CandidateSignals = { fts: 0, ftsMatched: false, dense: 0, keyword: 0, candidateSource: "fallback" };
export function clipRecallContent(content: string, limit = RECALL_CONTENT_PREVIEW_CHARS) {
  if (limit <= 0 || content.length <= limit) return { content, truncated: false, fullLength: content.length };
  return { content: `${content.slice(0, Math.max(0, limit-1))}…`, truncated: true, fullLength: content.length };
}
```

**Flow:** (1) synonym expansion + `classifyIntent`/`adjustWeights`; (2) hybrid retrieval across FTS + dense (cosine on decoded embeddings) + keyword match; (3) intent- and time-adjusted weighted blend into one score (±1); (4) optional MMR diversification; (5) build `RecallResult[]` with content clipped to 500 chars (trailing `…`), score, tier, id, createdAt, source; (6) update recall counts if requested. The linear fallback path is never empty while the store has rows.

**Invariant:** every number in a raw signal is optional (`asNumber` guards); a query never returns empty when the store has anything; previews always clip at 500 (`contentPreviewChars`) — the full row stays reachable via `Mnenopi.get()` / `memory://<id>`.

**Probe:** `test/beam-recall-unit.test.ts`, `beam-e3-e4-e6.test.ts`, `beam-parity.test.ts`, `polyphonic-recall.test.ts` (engine purity), `test/recall-diagnostics.test.ts` (signal audit).

## Consolidation — tiered retention, merge same-fact, sleep hosting history compaction

**Path/Symbol:** `packages/mnemopi/src/core/beam/consolidate.ts:consolidate`; `sleepAllSessions` drives it for old sessions.
**Signature:** `consolidate(beam, { memoryId?, k?, decay? }): Promise<{ merged, kept }>`.

**Flow (decisive):** pull candidates memory rows per session by importance
then age → iteratively merge neighbors below a similarity threshold → re-embed the merged → delete merged, insert merged atomically → schedule embeddings for new rows. Repetition runs per call.

**Invariants:** merge is atomic per row-pair; the merged row keeps the earliest created, the federated source, and updated `updated_at`; junk candidates (`EMPTY_FATAL` markers) are never merged — quarantined.

**Probe:** `test/beam-consolidate-unit.test.ts`; `consolidate-fact-concurrency.test.ts`, `-fact-id-collision.test.ts`, `-fact-sibling-races.test.ts` pin atomicity of merge.

## Get live
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(recall|recallEnhanced|consolidate|sleepAllSessions|clipRecallContent|formatContext)$", limit: 16, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.mnemopi.src.core.beam.recall.recall" });
```