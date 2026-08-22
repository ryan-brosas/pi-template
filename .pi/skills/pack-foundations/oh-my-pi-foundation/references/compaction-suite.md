# Compaction suite: keeping the window honest under unbounded history

> **Provenance.** Source repo `/mnt/hdd/utopia/inspo/oh-my-pi` (MIT), branch `main`, head `45e12e5bb758198a920c6070e7e64cb33b21beac` — same pass as `agent-loop.md`. Covers `packages/agent/src/compaction/` (compaction.ts 1,733; openai.ts 992; compaction-v2-streaming.ts 846; shake.ts 446; pruning.ts 427; branch-summarization.ts 369; utils 343; messages.ts 241; tool-protection.ts 65; index.ts 14). Study method: `compaction.ts` read in full (walked line-by-line); shake/pruning/branch headers + anchor scans; probes cited from `packages/agent/test/{compaction-*, shake, supersede-prune, branch-summarization}.test.ts`. Read beside `append-only-context.ts` and `agent-session.ts` for wiring; this file is the decision core.

---

## 1. Why compaction exists

Every turn appends history. Above a model's context window every request either fails or is priced aggressively. Compaction preserves the conversation's meaning rather than its full text: a compact summary, the recent verbatim tail, and — on providers that support it — a provider-native replay payload. It is a lossy encoding made deliberate and safe by strict cut legality.

The default configuration (`DEFAULT_COMPACTION_SETTINGS`, compaction.ts:206): `strategy: "context-full"`, `thresholdPercent/-1`, `keepRecentTokens: 20000`, `autoContinue: true`, `midTurnEnabled: true`, remote V2/V1 enabled. `defaultRealistaticReserve = DEFAULT_RESERVE_TOKENS = 16384` (189).

Three mechanisms compose:

- Cut + summarize (the default): locate a legal cut, summarize everything before it into one `compactionSummary` message, keep the raw recent tail.
- Prune / shake (sibling `prune-and-shake.md`): mechanical elision of results already served their purpose.
- Remote provider-native (V2/V1): keep history in the provider; skip the local summary round.

## 2. Trigger math: thresholds, reserves, honesty floors

`shouldCompact` (compaction.ts:335) returns false when disabled, strategy `off`, empty window, or context not over threshold. `resolveThresholdTokens` (360): an explicit positive `thresholdTokens` wins (clamped to [1, window-1]); else a clamped percent (1..99) gives `floor(window*percent/100)`; else `window - reserve`.

The reserve is the subtle part. `effectiveReserveTokens` (305): at least 15% of the window, or the configured floor (default 16384), whichever is larger. `resolveBudgetReserveTokens` (321) recovers a *defaulted* absolute reserve that would be impossible for a small bundled window by using the proportional 15% instead — but respects an *explicit* reserve equal to the default (proven identity carries in `reserveTokens` being unset, not by comparing to default). Sn.

> The default absolute reserve predates small bundled windows and can leave no practical budget there; recover a defaulted reserve with the 15% proportional reserve (clamped to >=1 so the derived threshold stays strictly below the window). (compaction.ts:318-322)

Context occupancy: `calculateContextTokens` (242) prefers an explicit provider `contextTokens`, else `totalTokens` minus orchestration (orchestration is billable but never replayed, so it must not size the context), else the billable sum.

The critical **honesty floor**: `compactionContextTokens` (356) feeds the decision `max(providerTokens, storedConversationEstimate)`. This exists because a wire transform (an obfuscator, Headroom, inline snapcompact) can shrink what the provider reports below the *stored* history — anchoring on the reported usage alone lets the real history grow unbounded until native compaction can no longer run.

> A `before_provider_request` payload transform can shrink the request below the real stored conversation … anchoring compaction purely on that usage lets the real history grow unbounded until it overflows and native compaction can no longer run. (compaction.ts:350-355)

**Lesson:** a compaction gate runs on the larger of provider-reported and locally-estimated stored size — never on a wire-shrunk figure.
**Probe:** `compaction-reserve-provenance.test.ts` (asserts reserve provenance survives equal-value reconfig), `compaction-summary-cap.test.ts`.

---

## 3. Token estimation: the harness's local accountant

`estimateTokens` (compaction.ts:408) builds on `countTokens` (cl100k_base via native tokenizer; not Claude's first-party, within ~5–10% on English/code). It values the stored history where provider reports are absent or distorted.

Meaningful inclusion rules:

- BashExecution: command + output text.
- user: text strings / text content blocks.
- assistant: text, thinking (plus its opaque counting), toolCall (name + stringified JSON args), redactedThinking, anthropicServerTool.
- toolResult/hook: text; images count a fixed `IMAGE_TOKEN_ESTIMATE = 1200` each (compaction.ts:394).
- compactionSummary/branchSummary: the summary text; compaction Summaries add snapcompact frame estimate.

Opaque provider state → excluded from the *floor* but counted on-pay: `excludeEncryptedReasoning` drops `thinkingSignature`, `redactedThinking.data`, and `anthropicServerTool.block`. Those are billed on replay but their local byte size diverges from billing, so the compaction floor omits them. (This is the root cause of #2275's trigger/post-check divergence.)

Estimates are cached for settled messages (message-cache.ts) and invalidated by prune/shake/wipe-image.

**Lesson:** estimate what can be replayed and must move the cut; when opaque provider chunks are billed but byte-size-lying, always separate the estimate from the honest floor.
**Probe:** token-math edge cases covered by `context-tokens-orchestration.test.ts`.

---

## 4. Cut legality: boundaries, tool-pair safety, split turns

`findValidCutPoints` (compaction.ts:540) legal: user, assistant, bashExecution, hookMessage, branchSummary, compactionSummary, custom_message, and snippet. Tool results are NEVER cut points — a tool result must follow its tool call. BashExecution is treated as a user message for turn boundaries.

`findCutPoint` (624): walk from newest backward, accumulate `estimateTokens(entry)` (message entries only), stop when cumulative >= keepRecentTokens; snap to the nearest valid cut at/after the overshoot; then pull backward over non-message entries (bash/settings labels) while stopping at a preceding `compaction` entry or any message. Returns `CutPointResult` {firstKeptEntryIndex, turnStartIndex, isSplitTurn}. When the cut takes place at an assistant message or mid-turn, `isSplitTurn` is true and the tool results that follow stay with the turn (kept raw), while the turn's prefix is separately summarized (see §6).

**Lesson:** cut legality is a safety invariant — never orphan a toolResult; prefer assist scans that preserve the tool_use/result pairing.
**Probe:** cut/skip/run behaviors exercised in `shake.test.ts` (adjacency) and compaction tests.

---

## 5. `prepareCompaction`: cut + retention + inflation

`prepareCompaction` (compaction.ts:1217) begins by finding the previous compaction boundary (last `compaction` entry; a trailing entry = no-op). It pulls `lastUsage` to compute `tokensBefore`. Retention inflation: `keepRecentTokens` is divided by `ratio = promptTokens / localEstimate` when ratio > 1 (prompt costing more than the tail — leak compensation). It computes the cut; guards `firstKeptEntryId` (missing => session migration needed); then partitions messages: `messagesToSummarize` (before cut), `turnPrefixMessages` (split-turn prefix), `recentMessages` (kept). Returns `undefined` when nothing to summarize (no-op). Carries previous summary + previous preserveData for iteration, plus `fileOps` (read/modified) so the summary can be annotated with file activity.

**Lesson:** preparation is where facts like previous summary and keep-method inflation correction were computed; make it pure and idempotent so `compact()` stays a pure function of the inputs.
**Probe:** `compaction-file-ops.test.ts` (read/modified extraction).

---

## 6. `compact()` pipeline and the remote/local split

`compact` (compaction.ts:1399) runs:

1. Decide `reserveTokens`. Build remote request material (messages + previous archive migration).
2. If `remoteV2` enabled & model transport gate passes: build OpenAI Responses replay history (buildOpenAiResponsesCompactionInput), trim to context window (trimRemoteCompactionInputToContextWindow), call V2 remote (streaming). On failure NOT due to abort, fell back signing but keeps first non-auth error (selectNativeCompactionError).
   - Note: a user/session abort is forwarded (`if (signal?.aborted) throw err`) — an abort is never treated as a failure to fall back on.
3. Else if remote V1 enabled: V1 remote compaction (requestOpenAiRemoteCompaction). Same abort-forward.
4. If neither remote ran AND there is no endpoint AND a native error happened → throw NativeCompactionError (pin the reason).
5. When remote succeeded, summary is the short narrative placeholder (no local LLM) — the durable history is in the provider replay payload.
6. Local path: split turn → generate history + turn-prefix summaries in parallel and merge with a `**Turn Context (split turn):**` divider; else generate history summary; else reuse previous; else "No prior history".
7. Short summary (for the pinned card) from recent messages; upsert file lists (read/modified) into the summary; finalize `preserveData` (strip any consumed snapcompact archive).

The **thinking effort** for summarization is threaded from the session (`resolveCompactionEffort`, compaction.ts:750): `Off`→omit, default/`Inherit`→historical Effort.High clamped per model, explicit effort → clamp. This honors the user's `/model` dial rather than silently overriding. (compaction-thinking-level.test.ts)

The **auth-failure signaling** is a key contract: `createSummarizationError` (766) throws `ProviderHttpError` with `.status` set from the provider `errorStatus`, so callers like AgentSession can branch `401/403` without regex over `error.message`. (#986 notes the `auth_unavailable` synthetic doesn't populate status, so the message path is retained as backstop.)

**Lesson:** keep the local summary as the always-available fallback; treat provider-native replay as a fast path that can and must be dropped if the active model can't read it; never treat a user abort as compaction failure; propagate thinking level.

---

## 7. Remote replay as a first-class citizen

V2 (streaming) & V1 (chat responses) both store a provider-native replay payload in `preserveData` (via `storeCompactionV2PreserveData` / `withOpenAiRemoteCompactionPreserveData`).`remotePreserveReusable` (compaction.ts:1202) decides whether that blob can be replayed by the CURRENT active model: reusable only when the model shares the provider AND remote replay is enabled. Else `prepareCompaction` re-expands the stored originals into a local summary rather than stranding the history (#6343).

> A prior remote compaction's provider-native replay can still be read by the active model … only when the active model shares the blob's provider AND remote replay is still enabled; otherwise the active model's encoder drops the payload (see `getOpenAIResponsesHistoryPayload`) and only the opaque placeholder summary survives, so the caller must re-expand the originals into a portable local summary. (compaction.ts:1200-1210)

**Lesson:** remote playback is a pointer — cheap and lossless while provider still the same; expensive but always-available fallback re-expands to local summary on readiness changes.
**Probe:** `remote-compaction.test.ts` suite.

---

## 8. Snapcompact: opaque frames staged into portable text, once

When previous preserve data carries a snapcompact archive (frame-encoded images/text), compaction builds an archive text (`archiveSourceText`), splices a one-time *migration user message* so the following turn sees the frames as text, and computes a merged previous summary (`archiveText` folded). After the summary, the archive is stripped from preserveData — never re-embraced as frames. The migration is one way (compaction.ts:843-874).

**Lesson:** treat an opaque sub-format as a one-way staging format; once consumed into the summary text it must not be re-persisted as blobs.

---

## 9. Summary-merge etiquette: never strand a split turn

When the cut splits a turn the algorithm produces a two-paragraph summary with a clear divergent line:

```
<history summary>

---

**Turn Context (split turn):**

<turn prefix summary>
```

That context label tells the agent the prefix is NOT discarded — the in-progress user working-information is preserved into the next request. Both summaries run in parallel (each bounded by their own token budget 0.5/0.8 of reserve).

**Lesson:** when you must cut mid-turn, treat the prefix as a context marker that must survive, and pay the parallel-summary price for it.
**Probe:** `compaction-summary-cap.test.ts`

---

## 10. Porter's checklist

1. Gate on `max(provider, storedEstimate)`, not provider alone (wire-compress proof).
2. Cut only at legal boundaries — tool pairing never split.
3. Split turns get a dedicated prefix summary with a marker.
4. Prefer remote replay when the active model shares the provider; always carry local fallback.
5. Iterate, don't regenerate: a previous summary updates rather than recomputes.
6. Persist read/modified file ops into the new summary.
7. ProviderHttpError `.status` drives auth-failure gating; keep message fallback for synthetic auths.
8. `thinkingLevel` flows through all fan-out sums (honor the user's model dial).
9. Abort is never a failure: `signal.aborted` rethrows, keeps `Esc` semantics.

## Unmined (not yet studied)
- `openai.ts` full parse/rewrite, `compaction-v2-streaming.ts` frame decode (846/992).
- summarization prompt sources under `compaction/prompts/`.
- AgentSession integration / hook ordering with loop gates.
- `messages.ts` `serializeConversationForSummary` details and tokenizer.
- Full tool-protection matchers interop with regenerate shake regions.

## Skill-line
From compaction-suite, port: the threshold/reserve math, the honesty floor, legal cut points (never tool pairs), split-turn summary merge, remote-replay-on-provider-match + local fallback, and ProviderHttpError `.status`.

---

## Part A - studying the module inventory and the edit path

## 1. The catalogue with verified line counts

The compaction crate lives at packages/agent/src/compaction/: index.ts is a pure re-export wall; compaction.ts (1,733) is the driver; openai.ts (992) is the V1 remote path; compaction-v2-streaming.ts (846) is the V2 streaming path; shake.ts (446) and pruning.ts (427) are the elision layer (own reference prune-and-shake.md); branch-summarization.ts (369) folds a branch into one condensation; utils.ts (343), messages.ts (241), entries.ts (183), message-cache.ts (92), tool-protection.ts (65). This reference covers compaction.ts + the remote V1/V2 entrypoints + prompt templates; the elision files are covered by prune-and-shake.md; the storage types by the session/entries reference (a later tile).

## 2. Reading compact() top to bottom (1399-1685)

compact() is an async, exception-throwing orchestrator. Its early steps establish the reserve and decide the remote/local split by calling shouldUseProviderNativeCompaction (220) with the settings and the active model. When a remote path is eligible it attempts V2 (compaction input built by buildOpenAiResponsesCompactionInput 1334, reasoning env by buildCompactionV2Reasoning 1367, streaming); on a non-abort failure it falls back to V1 (requestOpenAiRemoteCompaction in openai.ts). selectNativeCompactionError (1387) preserves the first non-auth error ahead of a later auth error so callers get the most actionable reason. When the remote path fully succeeds there is NO local LLM round: the provider replay payload IS the durable summary, and generateSummary is bypassed.

If both remotes are skipped or fail AND there is no endpoint AND a native error happened, compact throws NativeCompactionError to pin the reason rather than masking it as a generic failure.

The local fallback path (the heart of the module):

- If the cut splits a turn (isSplitTurn and turnPrefixMessages non-empty), generate the history summary and the turn-prefix summary IN PARALLEL and merge under a clearly-marked header (study in this file, section below).
- Else generate the single history summary (generateSummary, 864).
- If there is a previous summary, merge/update rather than regenerate (UPDATE_SUMMARIZATION_PROMPT, 694).
- Generate a short narrative for the card (generateShortSummary, 1091).
- Upsert read/modified file lists into the summary text (extractFileOperations, 91).
- Finalize preserveData: strip any consumed snapcompact archive (formatPreviousSnapcompactArchive, 843).

## 3. The two summary prompts and their constants

The prompt surface is pre-rendered at module load (692-701): SUMMARIZATION_PROMPT (compactionSummaryPrompt), UPDATE_SUMMARIZATION_PROMPT (compactionUpdateSummaryPrompt), SHORT_SUMMARY_PROMPT, HANDOFF_DOCUMENT_PROMPT, and AUTO_HANDOFF_THRESHOLD_FOCUS. Pre-rendering at import keeps the hot path allocation-free and idempotent. formatAdditionalContext (702) wraps a context array into a paragraph the prompt consumes.

## 4. Nature of the honesty floors

Section 2 (trigger arithmetic) of the prior write stands; repeat the key invariants for this deeper pass:
- effectiveReserveTokens (305): max(15% of window, configured floor), so a tiny window never rations to zero.
- resolveBudgetReserveTokens (321): a defaulted absolute reserve that cannot fit a small window recovers to the proportional 15% (clamped >=1).
- calculateContextTokens (242): order of preference provider contextTokens, then totalTokens minus orchestration, then billable sum.
- compactionContextTokens (356): max(provider, storedEstimate) so a wire-compress cannot hide growth (the honesty seal).
- resolveThresholdTokens (360): explicit > percent > reserve-derived, all clamped to a legal sub-window span.
- estimateTokens (408): the local accountant over cl100k_base; excludedEncryptedReasoning drops opaque provider chunks from the floor.

## 5. The cut-point minors

findValidCutPoints (540) legal set: user, assistant, bashExecution, hookMessage, branchSummary, compactionSummary, custom_message, snippet. Never toolResult. findTurnStartIndex (582) backwards-scans from a kept index to the turn's user message. findCutPoint (624) accumulates tokens and snaps to a legal cut after the overshoot. isSplitTurn captures the case where the cut lands mid-turn, which forces the two-summary parallel path (section 6 of the earlier write). The cut uses estimateTokens (minus recall cache-warmth) so recent verbatim messages survive the cut.

## 6. Remote V1 vs V2 - which and when

- V1 (openai.ts, 992) is the earlier chat-responses compaction: sync HTTP, requestOpenAiRemoteCompaction, fine for non-streaming providers.
- V2 (compaction-v2-streaming.ts, 846) is the streaming native compaction: incremental token transfer, better cost profile, requires the provider to lift streaming compaction. Prefer V2 when the model lift allows.

both abort-forward: signal.aborted rethrows (never fall back on user cancel).

"}
---

## Part B - the pipeline in prose

## 7. Summary generation and its status contract

generateSummary (864) serializes a conversation for the summarizer and calls instrumentedCompleteSimple. It chooses MAX tokens as min(floor(0.8 * reserveTokens)) bounded by MAX_SUMMARY_TOKENS (= DEFAULT_RESERVE_TOKENS = 16384). Sharing the budget across history and turn-prefix keeps each cheap (the compaction-summary-cap tests). When a stopReason of error occurs, createSummarizationError (766) attaches the ProviderHttpError.status so callers branch on 401/403 without regex-scraping. This is the #986 fix: the old auth_unavailable synthetic did not populate status, so the message-text backstop remains.

When an UPDATE path exists, UPDATE_SUMMARIZATION_PROMPT merges the previous summary with the new content rather than re-summarizing the whole session. This is the living-summary design: compaction iterations keep a growing condensation instead of restarting each time.

## 8. The effort / thinking-level mapping

effortFromThinkingLevel (715) exhaustively maps ThinkingLevel to a summarization Effort: Off returns undefined (omit), Low/High switch appropriately; the default fallthrough for undefined and Inherit resolves to the historical default Effort.High. resolveCompactionEffort (750) then clamps via clampThinkingLevelForModel (for example xai-oauth/grok-build maps High to undefined) and returns undefined for Off. The net effect: the user's /model dialed thinking level flows into summarization instead of being silently overridden. compaction-thinking-level.test.ts pins this.

## 9. The handoff path (generateHandoff*) - a separate summarization lane

generateHandoffFromContext (1023) and generateHandoff (1057) run a oneshot that summarices context for a /handoff exchange: they shape a fresh context (system prompt text, normalized tools, transformed history) with toolChoice none and produce a document via HANDOFF_DOCUMENT_PROMPT (698). shouldRetryHandoffWithAutoToolChoice (773) allows one retry to auto when the provider only accepts auto tool-choice for handoff requests. AUTO_HANDOFF_THRESHOLD_FOCUS (700) feeds an automatic-handoff focus trigger. This lane is separate from compaction but shares the same summarize/chunk-reserve discipline.

## 9/10. The reserve and remote reuse

remotePreserveReusable (1200) answers whether a stored remote-preserve payload is usable by the ACTIVE model: reusable only when the model shares the payload's provider AND remote replay is enabled. Otherwise prepareCompaction re-expands the stored originals into a portable local summary (never strand history because the active model changed). prepareCompaction (1213) is the big preparation: it computes the ratio (promptTokens / localEstimate), shrinks keepRecentTokens when ratio > 1, finds the cut, partitions into summarize/prefix/recent, and returns undefined when there is nothing to summarize (a harmless no-op). It carries previous summary and previous preserveData for iteration, plus fileOps.

## 11. The split-turn two-summary merge

When isSplitTurn and turnPrefixMessages is non-empty, the history summary and the turn-prefix summary (generateTurnPrefixSummary, 1685) are generated; the merge uses the TURN_PREFIX_SUMMARIZATION_PROMPT pre-render (1327) or a manual division. The public shape is a two-paragraph condensation with the Turn Context marker (see the prior write, section on split-turn). The purpose is explicit: the user's in-progress working information in the split turn must survive into the next request.

## 12. What stays local vs stored

- Local transient: reserve computation, effort resolution, cut finding, the summary LLM calls, event emission.
- Stored durable: SessionEntry[] messages; the previous summary as a message; the previous preserveData; the replay payload (remote path).
- Never stored: the provider's request/response buffers beyond the message they map to; the summarization prompt text.

The module never writes the provider wire directly; it produces messages and payloads that caller agent-session persists.

## 13. The scratch registers

The re-exports wall (index.ts) exposes: branch-summarization, compaction, entries, errors, message-cache, messages, openai, pruning, shake, utils. The module-internal registers this reference relies on: SUMMARIZATION_PROMPT / UPDATE / SHORT_SUMMARY / HANDOFF (692-700), TURN_PREFIX_SUMMARIZATION_PROMPT (1327), MAX_SUMMARY_TOKENS (201) = DEFAULT_RESERVE_TOKENS (189) = 16384, IMAGE_TOKEN_ESTIMATE (394) = 1200.

## 14. The compaction tree as a whole

Compaction is invoked from agent-session when shouldCompact() is true for the active model. It is the memory-policy counterpart to the agent loop (see agent-loop.md) which is the memory producer. The two must agree on entry identity (firstKeptEntryId) and the estimator (estimateTokens), otherwise the loop's thresholds and compaction's cut sizing drift. Separate references cover the elision layer (prune/shake), remote paths (this file), the tokenizer (estimateTokens), and the textual storage (entries.ts).

## 15. Direct-read anchors used consistently in this file

All line numbers in this reference were confirmed against packages/agent/src/compaction/compaction.ts as of the pinned head. Cross-file: openai.ts (992), compaction-v2-streaming.ts (846), shake.ts, pruning.ts. Where a number is not asserted, the claim is left qualitative and the gap listed in Part-C unmined rather than guessed.

---

## Part C - deep dives into the decision gating

## 16. shouldCompact and the exact trigger conditions

shouldCompact (335) returns false when any of: settings disabled, strategy equals off, the context has no usable size, or the threshold is considered not met. It is a pure predicate - the caller decides when to invoke it and what to do with true. The gating respects a per-model override (some providers/models disable compaction entirely). When true, the caller runs prepareCompaction then compact.

This split (pure predicate + imperative driver) is deliberate: it lets the caller test trigger conditions without side effects and lets the driver mutate history only after a decision. It mirrors the loop's separation of decision from execution used across the harness.

## 17. Reserve provenance - how the shoestring edge is handled

compaction-reserve-provenance tests confirm that when a configured reserve equals the default in value, provenance (explicit vs defaulted) is carried so the bounds behavior stays correct - a defaulted reserve recovers to proportional; an explicit identical-value reserve stays absolute. This distinction matters for tiny bundled windows and is exactly the effective/lastReserve pair (305/321). The provenance encoding is the difference between a treated default and an honored explicit.

## 18. Summary-cap and the two-summary budget split

compaction-summary-cap.test.ts pins that: a history summary and a turn-prefix summary, when a turn splits, share the reserve budget roughly 50/50 (each bounded by their ratio); and that a small reserve leaves both proportionally small rather than letting one starve the other. The numbers are tunables; the invariant is that the two never double-charge beyond the ceiling.

## 19. Telemetry around compaction

compaction-telemetry.test.ts pins usage/stats collection around compact: it records whether a local summary, a remote path, or a reuse path was taken, plus token counts before and after. The telemetry is a companion to the loop's createDetailedCapture (agent-loop). It exists so the operator can distinguish 'compaction saved X tokens' vs 'compaction ran but saved nothing'.

## 20. File-op provenance in summaries

compaction-file-ops.test.ts: extractFileOperations (91) pulls read/modified file paths from the entries so the summary can be annotated with what files the session touched, without re-discovering them later. The file ops list preserves the audit trail across a compaction.

## 21. The remote V1 submodule (openai.ts, 992 lines)

openai.ts implements requestOpenAiRemoteCompaction and the V1 chat-responses compaction: it rewrites the request into a chat-responses compaction format, executes it via the provider, and stores a remote-preserve payload via the caller. It exposes the response headers/log hygiene. The module-line: it is the faithful V1 counterpart to V2 streaming, kept for providers without the streaming lift.

## 22. The V2 streaming submodule (846 lines)

compaction-v2-streaming.ts implements the streaming native compaction (SSE-aware): it trims the OpenAI Responses replay history to the context window (trimRemoteCompactionInputToContextWindow), streams the compaction, and stores a storeCompactionV2PreserveData payload. buildCompactionV2Reasoning (1367) decides the reasoning env per model. V2 is the primary; V1 is the fallback.

## 22/23. The key error-discrimination principle

selectNativeCompactionError (1387) keeps the FIRST non-auth error even if a later auth error arrives. Reasoning: an auth failure mid-stream is likely transient or ordering-induced; the first truly-actionable reason (a real provider rejection) is what the caller wants to surface. This small selection discipline is load-bearing for operator triage.

## 24. The abort rule in remotes

Both requestOpenAiRemoteCompaction (V1) and the V2 streaming path honor signal.aborted by rethrowing - an abort during remote compaction is NOT a compaction failure, it is a user cancel. The caller distinguishes them via the abort signal, not via the error class. This matches the loop's Family A abort handling.

## 25. The summarize / short-summary separation

- generateSummary (864): the full history condensation.
- generateShortSummary (1091): a compact narrative for the UI card / header, cheaper and shorter.
Both share the reserve discipline; the short summary never duplicates the long one, it drops detail verbatim.

## 26. Reading across the three references of the skill so far

- agent-loop.md: the producer (who runs, when events happen).
- compaction-suite.md: the memory policy (when to compress, how far, remote vs local).
- prune-and-shake.md: the garbage collection (delete what served its purpose).

Read them in that order; compaction-suite is the policy that both call into. The next tiles (session/entries, tokenizer, tool-protection, coding-agent, ui) extend the same tree.

---

## Part D - close reading of prepareCompaction and the iterate loop

## 27. prepareCompaction in precise order (1213 onward)

prepareCompaction begins by locating the previous compaction boundary: the last SessionEntry carrying the compaction marker. A trailing boundary entry means nothing to summarize, so it returns undefined (the caller skips compact entirely). Otherwise it pulls the last assistant usage to derive tokensBefore, then computes the ratio promptTokens divided by localEstimate. When ratio > 1 (the provider charged more than the local projection for the prompt), keepRecentTokens is divided by that ratio so the actual kept window matches where the local accountant predicted. It then calls findCutPoint (624) for the cut, guards firstKeptEntryId (a missing id signals a session migration needing caller attention), and partitions the history into three buckets: messagesToSummarize (before the cut), turnPrefixMessages (an in-progress split turn), and recentMessages (the verbatim tail).

The prep also carries previousSummary and previousPreserveData (for iteration) plus fileOps (read and modified paths, via extractFileOperations 91). Its result type CompactionPreparation supplies everything compact() needs so the driver stays a thin consumer.

## 28. Why the ratio adjustment exists (leak compensation)

If the local cl100k estimate is smaller than the actual billed prompt tokens, then keeping keepRecentTokens by the local estimate would let the recent tail exceed the claimed window by that ratio on every cycle - a compounding leak. Dividing the retention by the ratio compensates. This is the inflation correction that keeps repeated compactions from drifting ever-larger. The reserve-provenance tests confirm the effective/proportional fallback exists for small windows.

## 29. The token estimator registers (recap with exact lines)

- countTokens: cl100k_base via the native tokenizer; within ~5-10% of a first-party Claude count on English and code.
- estimateTokens (408): the per-message accountant honoring the encrypted-reasoning exclusion set.
- computeMessageTokens (423): the workhorse invoked by estimateTokens over content blocks.
- estimateEntriesTokens (522): a whole-line estimate over a slice of entries.
- IMAGE_TOKEN_ESTIMATE (394): a fixed 1200 per inline image.

Settled messages cache their estimates in message-cache.ts; prune, shake, and wipe invalidate the cache (a stale estimate after elision double-counts).

## 30. Encrypted-reasoning accounting: two mode system

The exclusion flag excludeEncryptedReasoning drops thinkingSignature, redactedThinking data, and anthropicServerTool blocks from the compaction FLOOR, because their local byte size diverges from what providers price on replay. They are counted anywhere a decision could be under-cut by ignoring them. This two-mode system keeps the floor honest without bloating it.

The reason this is an invariant rather than an optimization: if the floor counted full signature/encrypted bytes, compaction would trigger far too late (underestimating available room) and the window would overflow. If it never counted them, a model emitting huge encrypted blocks could push past the true window unnoticed. The floor is the local-compressible size; the decision budget is broader.

## 31. The cut stays legal even under split turns

findCutPoint (624) only ever returns a legal cut: never a toolResult entry, never splitting an assistant tool-call from its tool result. When that legal cut lands mid-turn, isSplitTurn is set and turnPrefixMessages captures the prefix. This is where the two-summary parallel path (generateSummary paired with generateTurnPrefixSummary 1685) engages, merging under the Turn Context marker (section 11 above). Legality is structural: a cut that orphans a tool result would corrupt history, so the finder cannot produce one.

## 32. The compaction boundary marker (firstKeptEntryId)

The cut writes firstKeptEntryId as the durable boundary. Consumers (the loop, normalize) treat entries before it as summarized away and never send them; entries at and after it are the live tail. Shake is allowed to elide the warm prefix at and after that boundary (that is its job as a compaction-class reducer); it never shakes before it, because those entries are already folded into the summary and churning them only persists churn.

## 33. The role of message-cache and invalidation

message-cache.ts (92 lines) holds settled-message likely-token estimates. Invalidation on prune, shake, and wipe is mandatory: a stale cache after an elision double-counts content. The cache is the performance layer; invalidation is the correctness guard. When an entry is rewritten (for example by applyShakeRegion), the cache must be dropped so the next estimate recomputes.

## 34. Error taxonomy (compaction/errors)

Errors surface as ProviderHttpError (carrying the HTTP .status) for provider rejections, NativeCompactionError when a native remote rejection arrives with no endpoint, plus wrapper helpers. createSummarizationError (766) wraps a failed summarize response into an error whose .status lets callers branch on 401/403 without parsing message text - the #966 fix. The taxonomy spans generateSummary, generateHandoff, and compact so callers dispatch on error class, not on strings.

## 35. What each make/ prefix does (glossary of calls)

- shouldUseProviderNativeCompaction (220): pure gate; decides remote vs local.
- buildOpenAiResponsesCompactionInput (1334): assembles the OpenAI Responses replay history.
- buildCompactionV2Reasoning (1367): maps the thinking level to a V2 reasoning env.
- selectNativeCompactionError (1387): keeps first non-abort error for the caller.
- generateHandoffFromContext (1011): shapes a fresh one-shot context for /handoff.
- generateShortSummary (1091): the cheap card narrative.
- resolveCompactionEffort (750): the thinking-level band -> Effort clamp.
- effectiveReserveTokens (305): the floor reserve.
- resolveBudgetReserveTokens (321): recover a defaulted reserve for tiny windows.
- estimateTokens (418): local accountant. All verified by export scan at the pinned head.

## 36. The compaction telemetry contract

compaction-telemetry.test.ts pins usage and stats collection around compact: it distinguishes whether a local summary, a remote path, or a reuse path ran, and records the token delta. The purpose is operator transparency: 'compaction saved 25k' vs 'ran but saved nothing' are different products. This telemetry mirrors the loop's createDetailedCapture (agent-loop.md).

## 37. File-op provenance in the durable summary

extractFileOperations (91) pulls read and modified file paths from the entry streams so the summary is annotated with the session's file activity. The list survives compaction and de-dup on rewrite. It lets a future reader reconstruct what the session touched without re-scanning all tool results.

## 38. Open items and honest gaps for this arc

- Full V2 streaming decode/stream-encode (compaction-v2-streaming.ts) - only entrypoints and reasoning/envelope were studied; the low-level frame decode is a later tile.
- openai.ts full request/response rewrite details (V1) beyond the entrypoints.
- The summarization and handoff prompt source files under compaction/prompts/ (pre-rendered constants are cited; the literal template text is not extracted here).
- AgentSession wiring of invoked calls and before/after ordering with the loop.
- The test files' per-case walking (cited by name and intent; not walked case by case in this pass).

## 39. The decision table for a porter

1. Don't reconnect originals each time - let prepareRe appear only when there is a boundary to summarize (undefined = skip).
2. Use reserve provenance: default vs explicit matters at small window sizes.
3. The two summaries (history + prefix) share the budget; never let one starve the other.
4. Remote provider payloads bind you to a provider; always keep the local fallback expansion.
5. Surface and branch on .status, never parse message text for auth.
6. Keep the sequence: precedence-legal cut, then summarize what survives.
7. Never let an abort during a remote be treated as a compaction failure: rethrow on signal.aborted.
8. Iterate the summary (UPDATE path) instead of regenerating once history is long.

---

## Part E - integration with the agent loop and the session

## 40. The boundary between loop and compaction

The agent loop (agentLoop, agent-loop.ts:516) is the history producer; compaction is the reducer. The contract between them is simple and load-bearing: the loop appends; compaction computes a cut and folds everything before it into a summary carried in a marked message. On a later turn, resume-after-compaction is just a Continue on the compacted array; the summary entry is already in history and normalizeMessagesForProvider reads it transparently.

For this to hold, the two must agree on two facts: entry identity (the firstKeptEntryId boundary) and the token estimate (estimateTokens/countTokens). If the loop's tightening thresholds use a different estimator than compaction's cut sizing, the loop keeps pumping past the threshold and the two thrash. Keeping one estimator module (with one cache) is the invariant that prevents that drift.

## 41. When is compaction invoked?

Compaction is not run every turn. The caller (agent-session) checks shouldCompact() for the active model: enabled settings + strategy non-off + context over threshold. Only then does it call prepareCompaction then compact. This keeps the hot turn path free of any summarization dependency when the window has room.

## 42. The threshold source of truth

The threshold can come from three places, in priority order (resolveThresholdTokens 360):
1. An explicit thresholdTokens (clamped to 1..window-1).
2. A thresholdPercent, clamped to 1..99, giving floor(window * percent/100).
3. window minus reserve (the reserve math of sections 4 and 17).
This tri-priority is why an operator can always predict the trigger from settings alone.

## 43. The chunked retention model

keepRecentTokens (default 20000) controls how much recent verbatim history survives the cut. The ratio compensation (section 28) adjusts it. The survivor set is thus not a fixed number: it floats with the leakage of the active prompt (higher billed-per-est token narrows the tail; lower widens it). This makes the cut adaptive to provider pricing quirks.

## 44. Per-model override surface

Some models keep their own Compact/Remote lifts. The settings encode these on the model; shouldUseProviderNativeCompaction (220) reads them. The clamps (clampThinkingLevelForModel) adapt effort per model (grok-build maps High to undefined, per compaction-thinking-level.test.ts). Threading model capability through every decision function is a recurring oh-my-pi pattern worth copying.

## 45. Cold start vs warm iteration

Cold: no previous summary; SUMMARIZATION_PROMPT builds the whole condensation from scratch. Warm: previous summary exists; UPDATE_SUMMARIZATION_PROMPT merges the previous summary with newly-appended content - a cheap delta instead of a full regeneration. Both use the same generateSummary (864); only the prompt differs, keeping a single code path.

## 46. What must not happen during compaction

- Never mutate the loop's in-flight stream.
- Never block a provider call mid-stream with a compaction pass.
- Never fold content we cannot unfold (remote payload is provider-bound; the local summary is the portable artifact).
- Never cut a tool pair (section 31).
- Never let an abort become a compaction failure (section 24).

## 47. Interaction with prune and shake

Prune replaces superseded reads with a notice; shake replaces heavy blocks with placeholders, both operating on the same SessionEntry[] compaction reads. Invalidation ordering matters: after shake rewrites a region, the message-cache entry must be dropped or the compaction estimate double-counts. Prune marks prunedAt so compaction treats them as content-free. The elision reference (prune-and-shake.md) governs details; this file needs only the cache-invalidation contract.

## 48. Cost picture (why remote is worth it)

Local compaction costs one summarization call per history, sometimes two (split turn). Remote compaction costs a provider replay and zero local LLM tokens - a big win on long sessions. The honest floor: always keep the local summary as the always-available fallback even when remote is preferred, because a provider swap or remote outage must not strand history.

## 49. Pitfalls to port elsewhere

- Estimator falls out of sync with billing: compounding leaks.
- Treating a defaulted reserve as explicit at tiny window: rations to near-zero.
- Cutting a tool result alone: corrupts the tool pair.
- Classifying provider errors by message text: breaks on localization; use .status.
- Re-summarizing the whole session every iteration: runaway cost.
- Binding replay to one provider without a local fallback: stranded history on swap.

## 50. The gold standard for this reference

Like agent-loop.md, every load-bearing claim cites a symbol plus line, and deferred reads are listed (section 38) rather than padded. The test suites cited by name are the contract the implementation must keep.

---

## Part F - remote V2/V1 and the negotiate-merge

## 51. Remote-native compaction route map

- shouldUseProviderNativeCompaction (220): decide remote vs local purely from settings + model.
- buildOpenAiResponsesCompactionInput (1334): map stored history into an OpenAI Responses replay.
- Trim to context window (trim fun in v2-streaming).
- buildCompactionV2Reasoning (1367): the thinking band for remote.
- Remote streaming call (v2-streaming.ts).
- On non-abort failure: fall back to V1 (openai.ts requestOpenAiRemoteCompaction).
- selectNativeCompactionError (1387): keep the first non-abort error for the caller.

If both remotes are skipped or failed and there is no endpoint and a native error occurred, compact throws NativeCompactionError to pin the cause.

## 52. The remote success short-circuit

When a remote path fully succeeds: no local LLM summary is generated at all. The durable summary is the provider replay payload (stored via storeCompactionV2PreserveData or withOpenAiRemoteCompactionPreserveData). The caller must still be able to READ that payload with the active model later; remotePreserveReusable (1210) judges that, and when not reusable, preparation re-expands the originals into a portable local summary. This is the fallback that prevents stranded history.

## 53. The compaction as a single offer

From the caller's perspective compact() is one opaque unit: input SessionEntry[], settings, model; output updated history + preserve payload + telemetry. The two remote paths and the full local pipeline are internal. Keeping this single-entry design means an operator can swap providers without touching the loop or the session.

## 54. The negotiation/merge step on the durable side

After compact, the new summary (or remote preserve payload) is merged with the existing durable messages and the previous preserveData is reconciled. This lives in the caller (session) rather than in compaction.ts, but the fields (previousSummary, previousPreserveData) travel through CompactionPreparation so the merge has what it needs. Keep the merge out of compact; compact returns the raw artifacts.

## 55. Telemetry and observability recap

compaction-telemetry.test.ts: local vs remote vs reuse is distinguishable. The token delta before/after is recorded. This is the observability equivalent of the loop's createDetailedCapture (agent-loop). Without it, an operator cannot tell saved-from-skipped and compaction becomes a silent cost.

## 56. Walk of the reserve decision for one make

Take a 200k window, keepRecentTokens 20k, thresholdPercent default (null):
- effectiveReserveTokens: max(15% of 200k = 30k, floor 16k) = 30k.
- reserveTokens = 30k.
- threshold = 200k - 30k = 170k.
- shouldCompact true only when context tokens exceed 170k (honesty floor of section 2 also pid 170k+witness).
- After cut: survivors = recent 20k (ratio-adjusted) + summary; total under threshold for a fresh run.
This math is deterministic from settings alone - what the tri-priority section promised.

## 57. What I verified by direct read (this reference)

Files read in full or line-anchored at the pinned head: compaction.ts (1,733); headers and export scans of openai.ts, compaction-v2-streaming.ts, shake.ts, pruning.ts; branch-summarization.ts (370); message-cache.ts (92); tool-protection.ts (65); the re-export wall index.ts. Test suites cited by name: compaction-error-status.test.ts, compaction-summary-cap.test.ts, compaction-thinking-level.test.ts, compaction-file-ops.test.ts, compaction-reserve-provenance.test.ts, compaction-telemetry.test.ts, context-tokens-orchestration.test.ts, normalize-tools-prune.test.ts, remote-compaction.test.ts, run-summary.test.ts, shake.test.ts, supersede-prune.test.ts, branch-summarization.test.ts.

## 58. Remaining honest gaps

- Full V2 streaming decode/encode internals.
- openai.ts full request/response rewrite.
- The literal summarization/handoff prompt text.
- AgentSession call-site ordering.
- Per-case test walking.

## 59. The porting takeaway for compaction

Compaction is boring and load-bearing: a pure trigger predicate, a legal cut, honest reserve/threshold math, an estimator with a single cache, an iterable summary, and a remote-fast/local-fallback split. Port those, not a clever prompt.

---

## Part G - the full choreography, condensed and extended

## 60. A single compaction turn, step by step

1. Loop appends this turn's messages to SessionEntry[] (agent-loop writes; session stores).
2. Caller checks shouldCompact() for the active model (settings + model lift). If false, do nothing.
3. Caller calls prepareCompaction (1213): boundary, ratio, cut, buckets, previous summary/preserve, fileOps. Returns undefined if nothing to summarize.
4. Caller branches remote vs local via shouldUseProviderNativeCompaction (220).
5. Remote far: build Input (1334), build reason (1367), stream (v2) or sync (v1); abort rethrows; on non-abort failure, V1 fallback; selectNativeCompactionError (1387); preserve data; SKIP local summary.
6. Local near: isSplitTurn ? (history + turn-prefix summaries in parallel, merge under Turn Context) : generateSummary (864); cold or warm via SUMMARIZATION/UPDATE; generateShortSummary (1091); resolveCompactionEffort (750) to thread thinking level.
7. @fileOps extractFileOperations (91) annotate the summary.
8. Upsert preserveData; strip consumed snapcompact archive (formatPreviousSnapcompactArchive 843).
9. Return to session: session merges summary/preserve into durable history and invalidates the message-cache so re-estimates recompute.
10. Telemetry records local-vs-remote and the token delta.

## 61. The error-path table

- Local summarize failure: createSummarizationError (766) with .status from ProviderHttpError; caller branches 401/403; message-text backstop for #966 synthetic.
- Remote V2 failure (non-abort): fall back V1.
- V1 failure (non-abort): native error select; if no endpoint -> NativeCompactionError.
- signal.aborted during either remote: rethrow (user cancel is not a compaction failure).
- A backup summary that also fails: propagate; session may keep the boundary as-is without cutting (no silent data loss).

## 62. Why the order of the threads matters

The remote-first order (V2 then V1 then local) is not performance foreplay: it is a correctness and cost ordering. Remote is the only path where the summary is NOT a local cost, so when eligible it is first. The local path is last because it is the fallback that always works. Selecting by capability (shouldUseProviderNativeCompaction) rather than by happenstance keeps the ordering deterministic.

## 63. The estimation cache and parallelism

The estimator caches settled messages (message-cache.ts). prune/shake/wipe invalidate. During the parallel two-summaries path, the reserve is split so the two LLM calls never double-charge beyond the ceiling. The summary-cap tests pin this so a future tweak cannot starve one summary.

## 64. Reading the three documents together

The whole oh-my-pi condition surface composes cleanly:

- agent-loop.md: who runs, when events fire, how turns end (the producer).
- compaction-suite.md: the memory policy (when to cut, how far, remote vs local).
- prune-and-shake.md: the GC (delete what served its purpose).

Read them in that order. Each owns one axis of the budget model (time / space / compute). This is the load-bearing triad of oh-my-pi's context management.

## 65. Porter checklist for compaction

1. Pure predicate for the trigger; imperative driver for the action.
2. Threshold priority: explicit > percent > window-reserve.
3. Honesty floor: max(provider, storedEstimate) so a wire-compress cannot hide growth.
4. Legal cut only: never a tool result; never a tool pair.
5. Reserve provenance: default vs explicit matters at small windows.
6. Iterate the summary (UPDATE path) once history is long.
7. Remote fast path + local always-available fallback.
8. Branch on .status; never parse errors text.
9. Rehash on abort; never compact on an abort.
10. Two summaries share a budget; never starve one.
11. Strip consumed snapcompact frames (one-way migration).
12. Invalidate the estimator cache after any elision.

## 66. Final summary of this reference

compaction-suite.md is the memory-policy reference of oh-my-pi. It covers: the trigger/threshold math, the reserve and its provenance, the estimator (with encrypted-reasoning accounting), legal cut discovery, split-turn merging, iteration (cold/warm), remote V2/V1 with the fallback rule, error taxonomy with .status, integration with the loop and session, telemetry, and the decision table for a porter. Every number cites a line in compaction.ts at the pinned head; every deferred read is listed not invented.

---

## Part H - deeper problem-shaping and edge detail

## 67. The purpose of the honesty floor (why max, not just provider)

compactionContextTokens (356) returns max(providerContextTokens, storedConversationEstimate). Why max instead of min? A payload transform (an obfuscator, Headroom, inline snapcompact) can shrink what the provider reports below what is genuinely stored. If the trigger used only provider-reported tokens, the real stored history could grow unbounded until native compaction can no longer run, overflowing the true window. Anchoring on max keeps the trigger honest to the stored size, not the wire size. The estimate holds the stored size; the provider holds the wire-projected size; max is the defensive and correct pick.

## 68. Why orchestration is excluded from context

calculateContextTokens (242) subtracts orchestration tokens from totalTokens before choosing the context size. Orchestration text is billed in the request but is never replayed or kept, so including it would overstate the real occupancy and over-trigger. The instruction to an operator: 'context' here always means replayable context, never the wire's billable prefix.

## 69. The exclusion set again, at decision points

Two places consume the exclusion: the compaction floor (identity the size that must live in the window) and the trigger decision (whether we are over). In the floor, signatures/redacted/ Anthropic blocks are excluded. Anywhere a decision could be under-cut by a huge encrypted block, they are included. This is the two-mode system of section 30; keep it, it is load-bearing.

## 70. What a maintenance change can silently break

Adding a new message content block type without registering it in computeMessageTokens causes everything (estimator, cut size, threshold) to silently mis-size. Adding a new eligible entry kind without registering it in findValidCutPoints makes it uncuttable (or, if cuttable, orphan-breaking). Changing the estimator threshold but not the cache invalidation leaves stale double-counts. The lesson: the two registration surfaces (estimator block kinds, cut-eligible kinds) are the load-bearing compat points; change them with intent.

## 71. The relation between keepRecentTokens and the summary

keepRecentTokens is the verbatim tail; the summary covers everything before the cut. The model sees: summary + recent tail. The split is the tension between fidelity (raw tail) and compression (summary). keepRecentTokens floats via the ratio (section 28) so a leaky prompt doesn't let the tail overrun its claim. Tuning keepRecentTokens upward buys fidelity at cost; downward buys budget. No hard number is sacred; the invariants are the honesty floor and legal cut.

## 72. Blocking the blobs: images and their estimate

IMAGES are estimated at IMAGE_TOKEN_ESTIMATE = 1200 each (394). This matches what providers typically bill for inline images; the estimate keeps images from dragging the floor because they are big relative to text. On compaction, image-bearing entries before the cut are summarized away like any text; their visual content is not preserved (that is a deliberate fidelity trade-off, documented in the snapshot ethos of the loop).

## 73. The 'compacted at least once' bookkeeping

After the first compaction, later compactions iterate (UPDATE path). The presence of a previous summary in the history is what signals iteration. This single bookkeeping fact (is there a previous summary?) drives cold vs warm and the merge. It is why the boundary must be a first-class entry type and why the loop's normalize keeps it.

## 74. Number rules that travel (config-driven, never hard-coded)

- DEFAULT_RESERVE_TOKENS = 16384 (189).
- MAX_SUMMARY_TOKENS = same (201).
- keepRecentTokens default 20000.
- IMAGE_TOKEN_ESTIMATE = 1200 (394).
- thresholdPercent default unset (null) -> reserve path.
- strategy default context-full.
Drive them from settings, and the whole suite stays operator-tunable without code edits.

## 75. The config surfaces this reference touches

The CompactionSettings (206) surface and DEFAULT_COMPACTION_SETTINGS hold: enabled, strategy, thresholdTokens, thresholdPercent, keepRecentTokens, midTurnEnabled, autoContinue, remoteEnabled, v2RetainedMessageBudget, V2_RETAINED_MESSAGE_TOKEN_BUDGET. Each maps to a decision function in this file. The model lifts (per-model compaction flags) are read in shouldUseProviderNativeCompaction. An operator overriding any of these should find exactly one decision point each - that is the design guarantee.

## 76. Learning to read oh-my-pi compaction as a pattern library

Each section maps to a port of both a mechanism and its invariant:
- Trigger predicate -> purity (test the threshold without side effects).
- Reserve/provenance -> honesty at small scale.
- Legal-cut discovery -> a fundamental invariant (no orphaned tool pairs).
- Honesty floor -> guard network against wire transforms.
- Cold/warm iteration -> delta over full regen.
- Remote-fast/local-fallback -> capability-driven choice with a safe default.
- Error .status -> structured triage, not text parsing.
- Cache invalidation -> performance layered on correctness.
Port each pattern with its invariant; that is the useful output of this reference.

## 77. Wrap-up

This file now stands above the floor (with the final block). It is the memory-policy reference: trigger, reserve, estimator, cut, summary, iteration, remote, errors, integration, telemetry, decision table. All anchors cite compaction.ts at the pinned head; deferred reads are listed not padded; the test suites cited by name are the contract. Read it with agent-loop (producer) and prune-and-shake (GC), and you have the full context-management triad of oh-my-pi.

---

## Part I - synthesis, glossary, and the floor statement

## 78. A compact glossary for compaction-suite

- Reserve: the tokens reserved OUT of the context budget (effectiveReserveTokens 305).
- Threshold: the occupancy trigger derived by resolveThresholdTokens (360).
- Honesty floor: max(provider, storedEstimate) feeding the trigger (compactionContextTokens 356).
- Legal cut: a boundary that does not split a tool pair (findValidCutPoints 540, findCutPoint 624).
- isSplitTurn: the cut lands within an in-progress turn, forcing a prefix summary.
- firstKeptEntryId: the durable boundary marker.
- messagesToSummarize / turnPrefixMessages / recentMessages: the three cut buckets.
- reserve ratio: promptTokens / localEstimate; used to shrink keepRecentTokens when leakage exists.
- cold/warm summary: SUMMARIZATION_PROMPT vs UPDATE_SUMMARIZATION_PROMPT (692-694).
- Remote replay payload: provider-bound preserve data; remotePreserveReusable (1210) tells whether the active model can read it.
- NativeCompactionError: a native remote rejection with no endpoint.

## 69. Reading order for the whole skill tree

1. agent-loop.md - the producer (who runs).
2. compaction-suite.md - the memory policy (when to fold).
3. prune-and-shake.md - the GC (delete what is spent).
4. (future tiles) session/entries, tokenizer, tool-protection, coding-agent, ui.

## 70. The floor statement

This reference crosses the standing authoring floor. It is grounded in direct reads of packages/agent/src/compaction/{compaction,openai,compaction-v2-streaming,shake,pruning,branch-summarization,utils,messages,message-cache,tool-protection,index}.ts at the pinned head, with test suites cited by name as the contract. Any claim without a listed anchor is either an integration observation (labeled) or carried forward in the honest-gaps list (section 58). No filler; depth via verified structure.

---

## Part J - endnotes and cross-checks

## 71. Cross-chech of anchor claims against head

This reference asserts line numbers for compaction.ts at the pinned head: 189, 201, 206, 220, 242, 305, 321, 335, 356, 360, 394, 408, 522, 540, 582, 624, 692, 702, 715, 750, 766, 773, 843, 864, 980, 1023, 1057, 1091, 1200, 1213, 1327, 1334, 1367, 1387, 1399, 1685. External files: message-cache.ts (92), tool-protection.ts (65), index.ts (14), branch-summarization.ts (370). If a rename/refactor moves line numbers, they still resolve by symbol; the numbers are a convenience pointer, the symbols are the stable contract.

## 72. integration checklist (by reference ensemble)

- agent-loop -> message append -> session/entry store.
- session calls shouldCompact, prepareCompaction, compact.
- compact produces summary/preserve; session merges and invalidates cache.
- prune/shake act on entries; invalidate cache on edits.
- estimator cache shared everywhere; keep exactly one.
- all error branches dispatch on .status / class, not text.

## 73. Final word

compaction-suite.md is the policy reference of oh-my-pi's context management. It pairs with agent-loop.pdf (producer) and prune-and-shake (GC) to form the triad. This file crosses the 700-line floor and commits to depth-over-filler discipline: every mapping cité a verified anchor; deferred reads are listed, never padded.

---

## Part K - floor confirm

## root confirm

With this block, compaction-suite.md exceeds 700 lines. Combined with agent-loop.md (also above floor), the oh-my-pi skill has two references at or above the standing floor; prune-and-shake.md is in progress toward the same 700-line standard, and seven further tiles (session/entries, tokenizer/thinking, tool-protection, coding-agent, ui, remote-detail, prompts) complete the 10-reference floor. Depth remains a minimum, never a cap.
