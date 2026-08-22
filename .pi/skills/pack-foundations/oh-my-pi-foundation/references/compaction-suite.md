# Compaction suite: legal cuts and cache-aware reduction

## Provenance and coverage

Source-grounded from Oh My Pi, MIT, branch `main`, commit `45e12e5`, Codebase Memory project `oh-my-pi`. Core compaction, pruning, shake, cache, and protection sources report metadata matches. Tests are excluded by fast-pattern and were searched directly for named probes.

**Porting question:** how should an agent reduce context without splitting tool pairs, rewriting warm cache unnecessarily, or deleting recovery-bearing outputs?

## Trigger from an explicit usable budget

`shouldCompact` is a pure threshold predicate (`packages/agent/src/compaction/compaction.ts:335-339`). `resolveThresholdTokens` prioritizes a fixed threshold, otherwise derives one from percentage or reserve and clamps impossible small-window settings (`packages/agent/src/compaction/compaction.ts:360-384`).

**Adopt:** pure threshold computation with explicit provenance for configured versus default reserve.

**Probe:** small/tiny-window behavior and explicit/default reserve differences are pinned at `packages/agent/test/compaction-reserve-provenance.test.ts:13-92`.

## Token estimates are cached only when settled

`estimateTokens` reads/writes the message cache only for cacheable history and supports a separate encrypted-reasoning variant (`packages/agent/src/compaction/compaction.ts:408-421`). Any prune, shake, or mutation must invalidate the message's cached estimate.

**Adapt:** share one estimator/cache across every reducer. Replace the heuristic if the target has accurate cheap counts, but keep the settle gate and invalidation ownership.

**Probes:** streaming/error assistants bypass cache, estimate variants do not collide, and reducers invalidate counts (`packages/agent/test/message-cache.test.ts:61-177`).

## Cuts start at valid message roles

`findValidCutPoints` admits user/assistant and durable host-message boundaries but never tool results (`packages/agent/src/compaction/compaction.ts:540-575`). `findCutPoint` walks backward by estimated tokens, includes adjacent non-message state, and identifies a split turn (`packages/agent/src/compaction/compaction.ts:624-686`).

**Adopt:** legal-cut discovery separate from budget selection. This prevents orphan results and makes cut legality independently testable.

**Probe:** construct a turn with assistant tool calls/results and verify every candidate retains pairing; test both user-boundary and split-turn cuts.

## Preparation partitions history before summarization

`prepareCompaction` chooses a reusable previous compaction, adjusts recent-budget estimates when provider usage exceeds local estimates, computes a legal cut, and returns three explicit buckets: messages to summarize, optional turn prefix, and recent messages (`packages/agent/src/compaction/compaction.ts:1213-1321`). It also carries file operations and previous preserve data.

**Adapt:** preserve these buckets even if the target uses deterministic rather than model summaries. Omit provider-native preserve data unless replay compatibility is proven.

**Probe:** changing provider compatibility must expand opaque remote history for local summarization instead of stranding it.

## Pruning respects cache and recovery boundaries

`pruneSupersededToolResults` prunes duplicate/useless results only after the compaction boundary and, while the provider cache is warm, only when rewriting the suffix is cheap (`packages/agent/src/compaction/pruning.ts:249-303`). `pruneToolOutputs` additionally protects recent, small, or matched tool results and commits only when total savings justify mutation (`packages/agent/src/compaction/pruning.ts:305-408`).

**Adapt:** define supersede keys from tool semantics; path/range identity is not universal.

**Probes:** suffix/idle behavior, latest-read preservation, protected tools, errors, and keep boundaries are pinned at `packages/agent/test/supersede-prune.test.ts:136-638`.

## Shake removes regions, not meaning blindly

`collectShakeRegions` finds old tool outputs and large fenced/XML blocks after the retained boundary, respects recent/protected/error constraints, and returns nothing unless batch savings exceed the configured minimum (`packages/agent/src/compaction/shake.ts:297-356`). Region application then invalidates estimates.

`isProtectedToolResult` supports exact tool names and contextual matchers (`packages/agent/src/compaction/tool-protection.ts:52-65`). This protects skill/recovery reads without exempting every read forever.

**Adopt:** predicate-based protection and a batch savings gate.

**Probes:** protected/already-pruned/recent results, fenced blocks, and useless non-error handling are pinned at `packages/agent/test/shake.test.ts:72-235`; skill reads survive both prune and shake at `tool-protection.test.ts:53-78`.

## Verification recipe

1. Calculate thresholds for tiny, normal, and explicit-reserve windows.
2. Build legal-cut cases around complete and partial tool turns.
3. Compare local estimates with provider usage and assert retained-budget correction.
4. Exercise warm-suffix, idle, compaction-boundary, protected, useless, and error pruning.
5. Apply multiple shake regions highest-offset first and confirm cache invalidation.
6. Run a compaction twice and verify previous summaries/preserve data are reused only by compatible models.

## Known limits

Remote V1/V2 transport, summary prompt wording, branch archives, and session persistence are intentionally omitted. Re-query and crown them only for a target that needs those contracts.
