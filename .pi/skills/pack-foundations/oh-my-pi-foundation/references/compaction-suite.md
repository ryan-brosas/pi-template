<!-- capsule-v1 -->
# Compaction — cut legally, then reduce only cheap history

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Question:** How can local context shrink without orphaning tool results or invalidating prompt caches?

## Legal cuts precede budget choice
**Path/Symbol:** `packages/agent/src/compaction/compaction.ts:findValidCutPoints/findCutPoint` (540–686).
**Signature:** `findCutPoint(entries, startIndex, endIndex, keepRecentTokens): CutPointResult`.
**Data Shape:** session entries, legal indices, accumulated token estimate, split-turn metadata.

### Decisive source
```ts
case "assistant":
  cutPoints.push(i);
  break;
case "toolResult":
  break; // never start retained history at a result
```

**Flow:** enumerate legal boundaries -> walk backward by token estimate -> include adjacent non-message state -> return first kept entry plus split-turn prefix.
**Invariant:** retained history never begins at a tool result; a split turn is summarized separately, never silently discarded.
**Probe:** direct `packages/agent/test/compaction-reserve-provenance.test.ts:1–115` proves threshold provenance is distinct from cut legality.

## Prune and shake only mutable suffixes
**Path/Symbol:** `compaction/pruning.ts:pruneSupersededToolResults/pruneToolOutputs` (249–408); `compaction/shake.ts:collectShakeRegions` (297–356).
**Signature:** both receive `entries` and policy config; shake returns eligible regions without mutating them.
**Data Shape:** keep boundary, protected tools, suffix-token warmth, `prunedAt`, supersede key.

### Decisive source
```ts
const inWarmPrefix = messageSuffix[i] > cacheWarmSuffixTokens;
if (inWarmPrefix || i < boundaryIndex) continue;
if (!superseded && !useless && (accumulatedTokens < config.protectTokens || isProtected || tooSmall)) continue;
message.content = [{ type: "text", text: notice }];
invalidateMessageCache(message);
```

**Flow:** reject pre-boundary and warm-prefix entries -> respect protected/recent results -> require aggregate savings -> mutate and invalidate cached estimates.
**Invariant:** a superseded result is still preserved when rewriting its cached prefix costs more than its savings; tool calls remain untouched.
**Probe:** direct `supersede-prune.test.ts:526–650` protects deep cache-warm results but prunes tail copies; `shake.test.ts:72–135` preserves protected/recent/already-pruned results.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(findValidCutPoints|findCutPoint|pruneToolOutputs|collectShakeRegions)$", limit: 12, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.agent.src.compaction.compaction.findCutPoint" });
```
