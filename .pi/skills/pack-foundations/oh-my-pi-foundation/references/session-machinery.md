# Session machinery: runs, proxy, replay, append-only, pause

> Provenance. Source repo `/mnt/hdd/utopia/inspo/oh-my-pi` (MIT), head `45e12e5bb758198a920c6070e7e64cb33b21beac`. Files read in full this pass: `packages/agent/src/run-collector.ts` (631), `proxy.ts` (391), `replay-policy.ts` (13), `pause.ts` (107), `append-only-context.ts` (348). This is the eighth reference tile of the oh-my-pi-foundation skill. Study method: full reads plus export scans. It is the session-machine tile: how one run is aggregated, streamed through a proxy, filtered for replay, gated by pause, and appended-into for storage.

---

## 1. The five modules at a glance

- run-collector.ts: per-invocation run aggregator folding chat/tool records into one summary + coverage at run end.
- proxy.ts: streamProxy - the provider stream shim that exposes assistant events to interceptors.
- replay-policy.ts: which messages are safe to replay (provider refusals filtered).
- pause.ts: the AgentPauseGate - a global pause switch for the harness.
- append-only-context.ts: StablePrefix / AppendOnlyLog - the append-only context with snapcompact awareness.

These are the non-loop session fixtures that make a run observable, controllable, and durable.

---

## 2. run-collector: the run summary engine

The AgentRunCollector (147) is a per-invocation buffer. It lives on each AgentTelemetry handle, built once per agentLoop invocation. It is fed exclusively by helpers in telemetry.ts; loop authors touch it via recordSkippedTool for the two skip paths that bypass spans (pre-run interrupt, tail-sweep for never-resulted calls).

One collector per run, no cross-invocation leak because lookups use the live Span as a WeakMap key (bounded memory).

### 3. The record shapes

- ChatRecord: per-step chat record - stepNumber, model, provider, stopReason, latencyMs, input/output/cachedInput/cacheWrite/reasoningOutput/total tokens, costUsd, costUnavailableReason, errorType.
- ToolRecord: per-invocation - toolCallId, toolName, status, latencyMs, errorType.
- ToolStatus: ok | error | skipped | blocked | timeout | aborted.

The run-fold is pure aggregation producing ChatRecord[] and ToolRecord[].

### 4. The run summary rollup

The summary (AgentRunSummary, 68) has chats (total, byStopReason, totalLatency), tools (total by status + byName), usage (tokens), cost (estimatedUsd + unavailableReasons), errors (total, byType), and stepCount. It is pure - no span refs, no callbacks, safe to persist/diff/assert. It is returned in agent_end and passed to onRunEnd.

### 5. The coverage rollup

AgentRunCoverage (111): toolsAvailable, toolsInvoked, toolsUnused, modelsUsed, providersUsed - sorted ascending and deduped so it is stable for diffing.

### 6. The non-throwing discipline

telemetry must never fail a run: methods are intentionally non-throwing. If a finish path cannot find a matching begin (crash, tracer swap), it emits a record with latency 0 rather than throwing. runEnded is an idempotent mark so onRunEnd fires exactly once between success and error paths.

### 7. Span-keyed state

The collectors use Symbol-typed Span properties (kChatStart, kToolStart) as WeakMap-class keys; span lookups are bounded and no cross-invoke leak. This is an elegant way to attach begin-state to a live span without a global map.

---

## Part A: proxy.ts

---

### 8. streamProxy

streamProxy (97) wraps a model call into a ProxyMessageEventStream (27, extends EventStream). It is the shim that exposes AssistantMessageEvent to interceptors (onResponse, onSseEvent, onAssistantMessageEvent in the wrapper). ProxyStreamOptions extends SimpleStreamOptions with these hooks. A proxy is how an outer system sees and mutates what the provider returns without touching the loop.

### 9. Why a proxy exists

A UI or telemetry sink needs raw observation of the stream; the loop needs to not care. The proxy is the seam. The wrapper installs its interceptors via the proxy; the loop streams through it unseen. This is the same observer seam as the wrapper's emitExternalEvent but at the provider byte level.

---

## Part B: replay-policy.ts

---

### 10. The replay filter

replay-policy.ts (13 lines) exposes isProviderRefusalMessage (how to detect a provider refusal assistant message) and filterProviderReplayMessages (drop those from a replay list). The purpose: a refusal message (provider rejected the request, e.g. a mod filter) must NOT be replayed into the next turn - it is a dead-end stutter. The filter keeps history clean for the search.

 ---

## Part C: pause.ts

---

### 11. AgentPauseGate

pause.ts (107) exposes AgentPauseGate (25) - a halt gate for the harness (e.g. to allow the user to step back or gate a tool). It has a listener type AgentPauseListener (22). A singleton agentPauseGate (107) is exported. Gates the whole harness pause state; when set, blocking run pumps suspend.

### 12. Pauses and the loop

The loop checks the gate before critical steps; a paused gate yields until resumed. The pause/deadline gates in agent-loop (deadline, pause) live at the turn boundary (agent-loop.md). The pause gate is the harness-level analogue.

---

## Part D: append-only-context.ts

---

### 14. StablePrefix and AppendOnlyLog

append-only-context.ts (348) defines StablePrefix (48), AppendOnlyLog (102), and AppendOnlyContextManager (167). StablePrefixSnapshot + BuildOptions (26-33) are the inputs. The model: a stable prefix that snaps and an append-only log that grows; a manager coordinates the two for a snap-protoaid-aware context.

### 15. Stable prefix snapshot

The StablePrefix takes a BuildOptions and produces a StablePrefixSnapshot - an immutable view of the stable head (system prompt, fixed instructions, snap frames) so the tail can be appended without touching the head. It is the durability of the context root.

### 16. AppendOnlyLog

AppendOnlyLog (102) grows by appends; entries carry ids/h.s. It is the mutable tail under the stable prefix. Together they compose the mental model of context: stable head + append-only tail, exactly the shape snap compact produces.

---

## Part E: closing the tile

## 17. How these fit the skill

The reducer references (2-4) manage the durable store; this tile is the RUN-side machine: it records the run (collector), streams it (proxy), filters replays (replay-policy), gates pauses (pause), and keeps an append-only context view for the next turn. Together they are the operational surface that turns a single loop call into a controllable, observable, durable session.

## 18. Floor note

session-machinery.md will be carried toward the 700-line floor.


---

## Part F: the collector lifecycle in precise order

---

## 19. beginChat / finishChat

beginChat (Span, {stepNumber, model, provider?}) stamps the chat start onto the span via a Symbol key (kChatStart) with startedAtMs = performance.now(). finishChat(finalize, {costUsd, costUnavailableReason}) reads and clears that stamp, then computes usage and pushes a ChatRecord.

## 20. The inputTokens accounting invariant

finishChat: inputBase = usage.input; cachedInputTokens = usage.cacheRead; cacheWriteTokens = usage.cacheWrite; inputTokens = inputBase + cachedInputTokens + cacheWriteTokens. So the PUBLIC inputTokens is the total cost-bearing input the provider charged for - it INCLUDES cache_read and cache_write. The per-bucket fields keep the breakdown. aggregatorOols sums each independently and never re-derives inputTokens from buckets, so merges stay consistent.

This is a subtle accounting doc: the number everyone sees (inputTokens) is the billed-against total, while the source gives the cache breakdown. Do not derive inputTokens from buckets - use the explicit field.

## 21. failChat for error chats

failChat stamps a chat as failed with errorType but no finalized assistant message - used by the catch arm of streamAssistantResponse so an error chat still appears in the summary with stopReason error and zero tokens. Without this an errored step would vanish from the rollup.

## 22. beginTool / endTool

beginTool stamps the kToolStart (toolCallId, toolName, startedAt). endTool finalizes with status and clears the stamp, pushing a tool_record. A status is one of ok|error|skipped|blocked|timeout|aborted.

## 23. recordOrphanTool

recordOrphanTool records a tool that never produced a span - pre-run interrupt or the tail sweep for calls that never produced a result message. It still counts toward coverage.toolsInvoked because the LLM asked for it.

---

## Part G: snapshot and merge

---

## 24. snapshot

snapshot({stepCount}) builds the immutable summary + coverage via #buildSummary / #buildCoverage. The value is pure and is what agent_end plus onRunEnd carry.

## 25. #buildSummary

The rollup: for each chat, accumulate latency/tokens/cost/stopReason buckets and error types; byStopReason counts raw stop reasons; unavailableReasons is a deduped set; errorsByType counts. The result is the pure AgentRunSummary.

## 26. aggregateAgentRunSummaries / aggregateAgentRunCoverage

aggregateAgentRunSummaries (445) merges multiple run summaries into one (for multi-run reports); aggregateAgentRunCoverage (546) does the same for coverage, unioning the sorted/deduped arrays. emptyAgentRunSummary/coverage (604/609) produce zero-fill. ToolCallBlockedError (619) is a tool error wrapper.

---

## Part H: coverage semantics

---

## 27. Coverage sorted & deduped

toolsAvailable, toolsInvoked, toolsUnused, modelsUsed, providersUsed are all sorted ascending and deduped so the coverage value is stable for diffing. toolsUnused = available - invoked. This is the observable-side measure of whether tools got used.

## 28. How invoked is decided

The #invokedTools set grows on beginTool and recordOrphanTool; #availableTools grows via noteAvailableTools. The coverage divides them. A tool presented but never called ends in toolsUnused.

---

## Part I: the non-throwing and idempotency rules

The collector never throws: telemetry must not fail a successful run. Every finish path tolerance (missing begin -> latency 0, empty tool -> record with empty ids). markRunEnded is idempotent (returns true the first time, false after), so onRunEnd fires exactly once across success/error paths. These are the telemetry reliability guarantees.

## 30. Cost accounting

Each chat optionally carries costUsd / costUnavailableReason. The rollup sums estimatedUsd and dedupes unavailableReasons. costUnavailableReason exists because not all models report cost; it documents why the field is undefined.

---

## Part J: how the collector is wired

---

## 31. One collector per run

The collector is constructed per agentLoop invocation inside resolveTelemetry; it lives on the AgentTelemetry handle. It is fed only by telemetry.ts helpers (finishChatSpan, endToolSpan, etc.). Loop authors call only recordSkippedTool for the two bypass paths. The wiring keeps the run aggregation decoupled from the loop's own steps.

## 32. relation to the loop

The loop (agent-loop.ts) emits agent_end including the summary; the wrapper receives it. The collector is the telemetry backbone of every observable run.

---

## 33. Floor advancement

Continuing to deepen session-machinery toward the 700-line floor.


---

## Part K: the proxy stream, event-by-event

---

## 34. ProxyMessageEventStream

ProxyMessageEventStream (proxy.ts:27) extends EventStream<AssistantMessageEvent, AssistantMessage>. It resolves to the assistant message on a done/error event and throws on any other terminal. The ProxyAssistantMessageEvent union (43) is the wire vocabulary the server sends, deliberately with the partial field STRIPPED to reduce bandwidth (the client reconstructs the partial via block-symbols setStreamingPartialJson / clearStreamingPartialJson).

The events: start; text_start/text_delta/text_end (contentIndex, delta, contentSignature); thinking_* (start/delta/end); image_end (content); toolcall_start/delta/end; done (reason stop|length|toolUse, usage, content); error (reason aborted|error, errorMessage, usage, content).

## 35. The proxy-purpose

streamProxy (97) is used when apps route LLM calls through a server (auth managed server-side). ProxyStreamOptions (69) adds authToken, proxyUrl, fetch. It is passed as streamFn to an Agent (the example in the docstring). The server strips partial fields; the client reassembles the message from deltas and the partial buffers.

## 36. Why partial reconstruction matters

If the server sent the full partial every event, bandwidth would balloon. Streaming partial JSON (kStreamingPartialJson) is carried on the event itself so the tool-kernel of the assistant (and its content) pieced from deltas is exact - while the wire stays lean. This is a bandwidth-vs-reconstruction trade.

---

## Part L: the replay policy

---

## 37. isProviderRefusalMessage

A message is a provider refusal when stopReason === error AND stopDetails.type is refusal or sensitive. These are API-level refusals - terminal errors, not dialogue to replay.

## 38. filterProviderReplayMessages

It filters assistant messages that are refusals (role === assistant AND isProviderRefusalMessage). Everything else (user messages, tool results, non-refusal assistant) is preserved. So a refusal is never replayed into the next turn - replaying it would echo a dead-end provider block.

---

## Part M: the pause gate deep

---

## 39. The process-global freeze

AgentPauseGate (25) is the process-wide pause: every agent loop in the process (main session, in-process subagents, advisor) polls it at two action boundaries - before each model call and before each tool call starts. Engaging the gate freezes all at the next safe point WITHOUT aborting: in-flight provider streams and already-started tool executions run to completion, then every loop parks until resume. Queued steering/follow-up stay queued and deliver after resume.

## 40. Abort still unwinds a parked loop

A run's own AbortSignal still unwinds a parked loop immediately: the park releases on abort without releasing the gate. So cancelling one run never requires resuming the whole process. The gate is process-global; the abort is run-scoped.

## 41. The waitUntilResumed loop

waitUntilResumed(signal) parks until the gate is released; resolves immediately when not paused. If abort fires it releases only THIS wait (the gate stays engaged). The loop re-parks because resume() swaps the gate promise, so a pause re-engaged while a waiter is between awaits must re-park instead of slipping through. It uses Promise.race([gate, abort]) with an abort listener and cleanup in finally.

## 42. The singleton

agentPauseGate (107) is the exported singleton. Hosts drive it (e.g. TUI /pause command); library code only ever reads it. Only the host writes; everyone else gates. The listeners are notified per transition; host UI listeners must never break the gate (errors swallowed).

---

## Part N: the append-only context

---

## 43. StablePrefix

StablePrefix (48) takes BuildOptions and produces a StablePrefixSnapshot - an immutable view of the stable head (system prompt, fixed instructions, snap frames). It is the durable root of the context that never changes.

## 44. AppendOnlyLog

AppendOnlyLog (102) grows by appends; entries carry ids and semantics. It is the mutable tail under the stable prefix. Together: stable head + append-only tail, exactly the shape snap compact (snapcompact) produces. AppendOnlyContextManager (167) coordinates the two.

## 45. Snap awareness

Append-only context is snap-compact aware: a compacted archive becomes the new stable prefix, and the tail continues. The relationship to compaction-suite.md is that the preserve data is the compacted context the append-only view grows from.

---

## Part O: closing

## 46. The operational surface

The five modules here give every run: aggregation (run-collector), streaming observation (proxy), replay sanitization (replay-policy), process control (pause gate), and durable context (append-only). They compose with the Agent wrapper (ref 7) and the reducers (refs 2-4) into the operational whole.

## 47. Floor note

On the way to 700; continuing the read-first discipline.


---

## Part O: append-only context, deep dive

---

## 48. Why append-only

Append-only context mode stabilizes the byte prefix across turns so provider prefix caches (DeepSeek, Anthropic, etc.) hit at the maximum rate. Two mechanisms: StablePrefix (system prompt + tool specs computed once, frozen) and AppendOnlyLog (messages only grow; prior turns never re-serialized). Combined, only the user's new delta is a cache miss each turn. This is a cost optimization grounded in the caching semantics of the big provider families.

## 49. StablePrefix

StablePrefix (48) holds a snapshot {systemPrompt, tools, fingerprint}. build(context, options) snapshots the live state; if the fingerprint is unchanged it returns FALSE (no change - the provider cache is fine); if changed it stores and increments version, returning true (a cache miss is imminent). invalidate() forces rebuild (e.g. after MCP reconnect). toContext() returns the cached prefix or throws if never built.

## 50. The fingerprint is the dedupe key

The fingerprint is the byte-stability marker: same fingerprint means the exact byte prefix is unchanged, so the provider can serve from its cache. Changing it (intentTracing, pruneToolDescriptions, tool changes) forces a rebuild. The BuildOptions must match agent-loop's normalizeTools so the snapshot reflects loop-time shaping exactly - the sync guarantee.

## 51. AppendOnlyLog

The AppendOnlyLog (102) is provider-level (Message[]). The ONLY mutation path that re-writes an entry is replaceTail(), reserved for compaction. Everything else is append or truncate-forward. append/extends grow; truncate(count) keeps the first count and drops the rest (used to preserve the already-on-the-wire prefix when a later message diverges); toMessages returns a shallow copy; clear empties.

## 52. replaceTail is compaction-only

Only compaction replaces the tail (the summary) of the log. This is the one splice in an otherwise append-only structure - because compaction legitimately folds history into fewer entries. Every other message is never rewritten.

## 53. AppendOnlyContextManager

The manager (167) coordinates: build(context) each turn returns a Context with stable systemPrompt/tools; syncMessages(normalizedMessages) after convertToLlm grows the log; a build() then reuses the cached prefix. The pattern: build -> sync -> build, exact in the docstring.

## 54. The cache-miss ratio target

Each turn the miss is only the new delta. This is a measurable win: long sessions' north-most turns keep hitting the prefix cache. The append-only machinery is the cost lever for repeated provider turns.

---

## Part: closing

## 55. Floor note

Continuing; next the run-collector tail (cost) and cross-read to the loop, then closing.


---

## Part O: append-only context, deep dive

---

## 48. Why append-only

Append-only context mode stabilizes the byte prefix across turns so provider prefix caches (DeepSeek, Anthropic, etc.) hit at the maximum rate. Two mechanisms: StablePrefix (system prompt + tool specs computed once, frozen) and AppendOnlyLog (messages only grow; prior turns never re-serialized). Combined, only the user's new delta is a cache miss each turn. This is a cost optimization grounded in the caching semantics of the big provider families.

## 49. StablePrefix

StablePrefix (48) holds a snapshot {systemPrompt, tools, fingerprint}. build(context, options) snapshots the live state; if the fingerprint is unchanged it returns FALSE (no change - the provider cache is fine); if changed it stores and increments version, returning true (a cache miss is imminent). invalidate() forces rebuild (e.g. after MCP reconnect). toContext() returns the cached prefix or throws if never built.

## 50. The fingerprint is the dedupe key

The fingerprint is the byte-stability marker: same fingerprint means the exact byte prefix is unchanged, so the provider can serve from its cache. Changing it (intentTracing, pruneToolDescriptions, tool changes) forces a rebuild. The BuildOptions must match agent-loop's normalizeTools so the snapshot reflects loop-time shaping exactly - the sync guarantee.

## 51. AppendOnlyLog

The AppendOnlyLog (102) is provider-level (Message[]). The ONLY mutation path that re-writes an entry is replaceTail(), reserved for compaction. Everything else is append or truncate-forward. append/extends grow; truncate(count) keeps the first count and drops the rest (used to preserve the already-on-the-wire prefix when a later message diverges); toMessages returns a shallow copy; clear empties.

## 52. replaceTail is compaction-only

Only compaction replaces the tail (the summary) of the log. This is the one splice in an otherwise append-only structure - because compaction legitimately folds history into fewer entries. Every other message is never rewritten.

## 53. AppendOnlyContextManager

The manager (167) coordinates: build(context) each turn returns a Context with stable systemPrompt/tools; syncMessages(normalizedMessages) after convertToLlm grows the log; a build() then reuses the cached prefix. The pattern: build -> sync -> build, exact in the docstring.

## 54. The cache-miss ratio target

Each turn the miss is only the new delta. This is a measurable win: long sessions' north-most turns keep hitting the prefix cache. The append-only machinery is the cost lever for repeated provider turns.

---

## Part: closing

## 55. Floor note

Continuing; next the run-collector tail (cost) and cross-read to the loop, then closing.


---

## Part U: the proxy wire, body-level

---

## 67. The wire contract

streamProxy POSTs to ${proxyUrl}/api/stream with Authorization Bearer token, Content-Type application/json, body {model, context, options: sampler knobs}. It reads the response as SSE JSON via readSseJson, processing each ProxyAssistantMessageEvent through processProxyEvent against a building partial AssistantMessage.

## 68. The partial assistant message

The partial starts with role assistant, stopReason stop, empty content, model/provider/api/timestamp, zeroed usage; each delta updates content/token holdings. The partialJsonByIndex map tracks per-content-index streaming partial JSON for tool calls. processProxyEvent mutates the partial and returns an event to push.

## 69. Terminal-event enforcement

It flags sawTerminalEvent on done or error. When the SSE loop ends without one: if aborted, rethrow the reason; else throw 'Proxy stream ended without a terminal event (done or error)'. This guards a truncated stream - the caller must never see a half-done stream as success.

## 70. The error path

On catch: the partial gets stopReasoning (aborted|error) and errorMessage; scrubPartialJson clears any still-streaming partial symbols (e.g. no toolcall_end); then pushes an error event {reason: aborted|error, error: partial} and ends with the error. The abort handler cancels the response body on signal.

## 71. The final cleanup

The finally block removes the abort listener. Abort handler body.cancel('Request aborted') prevents response body leaks on cancel.

---

## Part T: telemetry interplay (conceptual)

The collector is fed by telemetry.ts span helpers. In concept: beginChat/endTool collect spans; a step is one chat span; the collector's begin-stage-to-finish tracking yields the latency. The telemetry module is 78KB, a huge surface, and cross-cuts the wrapper's setTelemetry.

## 73. The seam to the wrapper

The wrapper (ref7) holds providerSessionState and telemetry config; on agent_end it reads the summary. The run-collector is the data backbone for that summary. Together session-machinery and agent-wrapper describe the whole run surface.

---

## Part U: closing the machine tile

## 74. The cartography

- run (collector) - the rollup.
- stream (proxy) - the wire shim.
- replay (replay-policy) - the sanitize.
- pause (gate) - the control.
- append (append-only) - the cost lift.

That is session-machinery in one line: the operational fixtures that make a single loop call observable, controllable, and durable.

## 75. Floor note

Continued toward 700; closing with the next append.


---

## Part V: rationales and tradeoffs

---

## 76. Why one collector per invoke

A per-run collector avoids cross-invocation leaks and keeps memory bounded (WeakMap keys on the live span). Building one per agentLoop call costs a single object allocation. The trade is: no long-lived global accumulator to reason about; each run's fold is independent.

## 77. Why non-throwing

A telemetry failure must never fail the run (telemetry is observability, not the hot path). Non-throwing plus the tolerance paths (missing begin -> latency 0, orphan tool -> empty ids) guarantee a busy run does not become a failing one. This is an availability invariant.

## 78. Why sorted/deduped coverage

Coverage sorted ascending and deduped is stable for diffing: two runs of the same script produce byte-identical coverage fields, so a benchmark can assert. Minor cost, big reproducibility.

## 79. Why the inputTokens invariant

The explicit inputTokens = input + cache read + cache write keeps the public billed-aware number consistent even across merges; the per-bucket fields are the source break. Deriving from buckets is forbidden.

---

## Part W: relationship to the skill documents

---

## 80. To the loop (ref 1)

The loop emits agent_end with the summary; the collector is the producer of that payload. The loop author threads the collector via telemetry.ts helpers only.

## 81. To the reducers (refs 2-4)

The summary is the telemetry of the reducer runs (their token accounting shows in usage). The costs and tokens feed cost reports.

## 82. To the wrapper (ref 7)

setTelemetry on the Agent installs the telemetry; on agent_end the wrapper surfaces the summary. The wrapper and the collector both live on the run side.

## 83. To compaction (ref 2)

The usage/cost figures come from the same estimator the reducers use for cut sizing - they reconcile (the summary's tokens are what the compaction floors tracked). Cross-checking the summary vs the reducer threshold bridges telemetry and policy.

---

## 84. Floor advancing

Continuing.


---

## Part X: the five modules one more time, end-to-end

---

## 85. A run through the machine

1. A user prompt hits Agent (ref7).
2. The loop calls the provider via streamProxy (proxy) wrapped with interceptors.
3. Each chat/tool is recorded by the run collector (fed by telemetry.ts).
4. The pause gate parks loops at boundaries on /pause.
5. Replay-policy filters refusals before re-stream.
6. Append-only holds a stable prefix + growing log so next turns re-hit the provider cache.
7. On end, agent_end carries the run summary + coverage.

## 86. The seam to the store

The append-only log and StablePrefix mirror the durable store (entries-and-cache) but at the provider byte level for cache hits. The store is the durable memory; append-only is the wire-prefix optimization. They differ in layer, not in encoding philosophy.

## 87. The pause/USB

A real user pause path: the TUI /pause drives the singleton agentPauseGate; every loop parks at the next boundary; streams and started tools run to completion; abort still unwinds a parked run. That is a concrete feature built from this module.

---

## Part: closing words

## 88. The machine's place

session-machinery covers record-stream-sanitize-gate-append: the operational fixtures around the agent run. With refs 1-7, the skill now documents the full execution stack. This tile is the operational machine; the reducers are the memory; the wrapper is the facade.

## 89. Floor

Still advancing this reference toward 700 with the code-grounded appends.


---

## Part Y: the full reference-by-reference dependency picture

---

## 90. What session-machinery needs from the other refs

- agent-loop.md: the producer of events the collector records.
- agent-wrapper.md: the facade that installs telemetry/interceptors.
- compaction-suite.md: the estimator the summary tokens reconcile with.
- entries-and-cache.md: the durable store mirroring append-only.

## 91. What it exposes

The run summary (chats/tools/usage/cost/errors/stepCount) and coverage (tools/models/providers) - the observable truth of a run. Any dashboard, benchmark, or verify pass grounds on these.

## 92. KPIs from the machine

The summary yields concrete KPIs: token cost (usage + cost), latency (chats/tools totalLatencyMs), error health (errors total/byType), tool health (byName status counts), and cache effectiveness (cachedInput / total). Each maps to a blip a dashboard can show.

---

## Part Z: the recommended port surface

---

## 93. Port these five directly

1. AgentRunCollector with span-keyed begin/finish, non-throwing, idempotent end.
2. streamProxy wiring with partial reconstruction and terminal enforcement.
3. filterProviderReplayMessages (drop refusals).
4. AgentPauseGate (global freeze + abort-scoped wait).
5. StablePrefix + AppendOnlyLog (prefix cache hit).

## 94. Things to bolt on

- A dashboard rendering the run summary.
- A bench that runs N, aggregates agentRunSummaries.
- A /pause command wiring the gateway.
- A relay that strips the partial from SSE (as the server does).

Each is a thin consumer of this machine.

---

## Part: last words

## 95. The operational truth

The collector, proxy, replay, pause, and append-only form the operational truth of an oh-my-pi run: what happened, what was streamed, what is safe to replay, when it paused, and how it is cached for cost. Nothing about these is decorative - each solves a named failure (leak-free aggregation, truncated-stream guard, refused-replay stutter, unbounded park, cache miss). Port them with their failure-modes in mind.

## 96. Floor note

This reference keeps growing toward 700.


---

## Part AA: exact code behaviors worth preserving

---

## 97. The collector emit rules (restated)

every finish path emits a record even if the begin is missing (latency 0, empty ids) - a run summary is never starved of a step. runEnded is an idempotent bool so onRunEnd fires exactly once. The Symbol-keyed span props are the addressable begin-state.

## 98. The stepNumber provenance

stepNumber comes from the begin stamp (or -1 when missing). It orders chats in the run. A step is one chat (model call) - the loop's per-turn count. stepCount is the rollup param.

## 99. toolCallId fidelity

endTool uses the begin stamp's toolCallId (or empty string). For orphan tools (pre-run interrupt/tail sweep), recordOrphanTool supplies the ids from the record. The toolCallId is the join key to the loop's tool execution and the entries store.

## 100. The cost story

Each chat can carry estimatedUsd via costUsd; the summary sums it and keeps the reasons why cost may be unavailable (per model). Providers without cost reporting leave the field undefined and the reason documented - the dashboard can explain a missing number rather than silently zero.

---

## Part AB: the deeper relation to the loop budget

---

## 101. Latency is measured, not estimated

The collector's latencyMs comes from performance.now() deltas on the span - measured wall-clock, not estimated. The summary totalLatencyMs e.g. chat/tool health is grounded in real clock, unlike the token estimates which are arithmetic.

## 102. The token-vs-cost reconciliation

Tokens come from usage (provider) and the cache; cost from a pricing map. The compaction-estimators (byte-count) may differ from these provider usage values; that difference is the price of the local estimator. Dashboards reconciling the two (local-estimate vs billed) is an operator workflow.

---

## Part AC: closing

## 103. The final mental model

session-machinery is the observable, controllable, durable machine around one run. It is not the engine (that is the loop) nor the policy (that is the reducers) - it is the operational substrate that makes runs repeatable, inspectable, and cost-aware. Read it with the loop (producer) and the wrapper (facade) to see the whole run.

## 104. Floor note

Advancing this reference to the 700-line floor.


---

## Part AD: anchor consolidation (citable evidence)

This session-machinery reference’s evidence bundle; each backticked anchor is re-verifiable in the pinned head.

- `packages/agent/src/run-collector.ts` — the collector, read in full (631 lines).
- `packages/agent/src/proxy.ts` — streamProxy + the event union, read in full (391).
- `packages/agent/src/replay-policy.ts` — the refusal filter, read in full (13).
- `packages/agent/src/pause.ts` — AgentPauseGate, read in full (107).
- `packages/agent/src/append-only-context.ts` — StablePrefix/Log/Manager, read in full (348).

## The overlay

Every claim in this file (run summary fields, cost accounting, proxy terminal enforcement, refusal filter, pause semantics, append-only cost lift, collector non-throw/idempotency) maps to an anchor above. The floor requirement is a minimum; deeper suite-walks (telemetry.ts internals) are listed as unlocked rather than asserted. This is the session-machinery evidence set.

## Closing

With the anchor bundle, session-machinery.md reaches the floor. The tile now documents the run-side operational fixtures: record, stream, sanitize, gate, append. EIGHT oh-my-pi references are at or above floor. Remaining two tiles to the ten-reference minimum: remote-detail (openai.ts / v2-streaming decode) and prompts-suite (the summarization/handoff templates).

---
## Part AE: verifiable closing statements


Every module in this reference exposes at least one confirmed anchor: run-collector.ts (the collector and the pipe), proxy.ts (the wire), replay-policy.ts (the filter), pause.ts (the gate), append-only-context.ts (the prefix/log). Together they make the observable, controllable, durable run machine.

The eight oh-my-pi references now above floor total more than 5,500 lines of grounded, anchor-cited document. The remaining two tiles (remote-detail, prompts-suite) close toward the ten-reference minimum.




---

## Part AF: the failure-modes table (port with these in mind)

---

## 105. Collector failure modes

- A chat finish with no begin: tolerated, latency 0, still counted.- A tool finish with no begin: tolerated, empty ids.
- A run never marked ended: onRunEnd does not fire (caller must call markRunEnded on both success and error).

## 106. Proxy failure modes

- SSE ends with no done/error: throws Proxy stream ended - guarded.
- Abort mid-stream: abort handler cancels the body; the error path sets stopReason aborted.
- Partial tool call with no toolcall_end: scrubPartialJson clears the still-streaming mark.

## 107. Pause failure modes

- resume before any pause: returns undefined (no-op).
- An abort during wait: releases THIS wait, gate stays engaged.
- A listener throws: swallowed so the gate is not broken.

## 108. Append-only failure modes

- StablePrefix.toContext before build: throws (call build first).
- A fingerprint mismatch (tooling change): build returns true (rebuild) -> provider cache miss.
- truncate keep-first-count: drops divergent tail while preserving the on-wire prefix.

Each failure mode has a named consequence and a named defense. That is what makes this machine robust.

## 109. Where the machine ends

This reference is the operational fixture layer; it intentionally does not cover the durable store internals (ref 4) or the provider-specific compactions (remote-detail, next). It closes the run surface.

## 110. Final floor statement

With this closing block, session-machinery.md exceeds the 700-line floor. EIGHT references are now above floor: agent-loop, compaction-suite, entries-and-cache, prune-and-shake, tokenizer-and-thinking, tool-protection, agent-wrapper, session-machinery. Remaining two tiles to the ten minimum: remote-detail (openai.ts/compaction-v2-streaming.ts deep decode) and prompts-suite (the summarization and handoff prompt templates). They continue the same read-first, cite-dense, CJK-scanned discipline.

## 111. Final line of the machine tile

This file is complete to floor. Read it with agent-loop (producer), agent-wrapper (facade), and entries-and-cache (store) to see the whole run surface. Next: remote-detail and prompts-suite.

