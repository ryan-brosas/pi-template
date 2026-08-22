<!-- capsule-v1 -->
# Compaction suite: legal local reduction

**Provenance:** Oh My Pi (MIT), main @45eaa; Codebase Memory project oh-my-pi. compaction.ts, pruning.ts, shake.ts, tool-protection.ts are source-covered; tests are fast-index excluded (direct-source probes).

**Porting question:** how should an agent cut local history without orphan split tool-result pairs, stale token accounting, or loss of recovery-bearing output?

## Capsule: budget and settled estimates are separate

**Path/Symbol:** packages/agent/src/compaction/compaction.ts:shouldCompact (335-339), resolveThresholdTokens (360-384), estimateTokens (408-421).
**Data Shape:** threshold order (fixed > percent > window-reserve); a message token cache is valid only for settled/cacheable history.
**Flow:** resolve usable threshold -> compare occupancy -> estimate retained history -> cache settled values -> invalidate the estimate on any prune/shake/reducer mutation.
**Porting shape:** threshold = fixed ?? percent(window) ?? window - reserve; if occupancy > threshold { prepare }; cache only after message settles; invalidate on mutation.
**Invariant:** budget selection does not decide cut legality; no cached estimate outlives a history mutation.
**Adopt/Adapt/Omit:** adopt pure threshold + invalidation ownership; adapt token heuristics/reserve defaults; omit provider-specific encrypted fields when absent.
**Probe:** compaction-reserve-provenance.test.ts:13-92 (small-window/default-reserve); message-cache.test.ts (cacheability + variants).
**Retrieve:** graph-search the three symbols, read snippets, then direct-read the excluded tests.

## Capsule: choose a legal cut, then partition the turn
**Path/Symbol:** compaction.ts:findValidCutPoints (540-575), findCutPoint (624-686), prepareCompaction (1213-1321).
**Signature:** findCutPoint(entries,startIndex,endIndex,keepRecentTokens); findValidCutPoints admits user/assistant/durable-host boundaries, never tool-result.
**Flow:** enumerate legal message-role boundaries -> walk backward by token estimate -> keep adjacent non-message state with its turn -> note split turns -> partition messagesToSummarize vs turnPrefix vs recent before a summarizer.
**Invariant:** retained history never starts at a tool result; split-turn prefix is summarized separately, not dropped.
**Retrieve:** graph-trace prepareCompaction into the cut/summary callers, direct-read compaction tests for pairing/split-turn assertions.

## Capsule: prune/shake are guarded suffix mutations with protection
**Path/Symbol:** pruning.ts:pruneSupersededToolResults (249-303), pruneToolOutputs (305-408); shake.ts:collectShakeRegions (297-356); tool-protection.ts:isProtectedToolResult (52-65).
**Flow:** act only after the retained boundary; reject recent/protected/error/needed output; keep semantic supersede identity; mutate only when aggregate savings clear the configured minute; invalidate estimates.
**Invariant:** recovery-bearing results and the latest useful reads survive; cache warmth alone does not justify rewriting an expensive prefix.
**Probe:** tests: supersede-prune, shake, tool-protection (direct-source).
**Retrieve:** round up each file's specifics after graph-search + direct test reads.