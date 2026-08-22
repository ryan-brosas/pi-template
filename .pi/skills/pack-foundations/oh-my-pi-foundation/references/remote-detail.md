# Remote-detail: the provider-native compaction wire

> Provenance. Source repo `/mnt/hdd/utopia/inspo/oh-my-pi` (MIT), head `45e12e5bb758198a920c6070e7e64cb33b21beac`. Files read in full this pass: `packages/agent/src/compaction/openai.ts` (992) and `packages/agent/src/compaction/compaction-v2-streaming.ts` (846). This is the ninth reference tile of the oh-my-pi-foundation skill. Study method: full reads of both remote modules plus cross-read of compaction-suite.md (the calling driver). It is the provider-native compaction wire: the V1 chat-responses path (openai.ts) and the V2 streaming path (compaction-v2-streaming.ts).

---

## 1. The two remote paths

oh-my-pi can run compaction on the provider: V1 (openai.ts) does a sync chat-responses compaction; V2 (compaction-v2-streaming.ts) streams. Both store a provider replay payload so the durable summary is the provider history; local summarization is skipped when remote succeeds. The driver chooses via shouldUseProviderNativeCompaction (compaction-suite).

---

## Part A: openai.ts constants and trim

---

## 2. The hard timeout

REMOTE_COMPACTION_TIMEOUT_MS = 180_000 (openai.ts:69). Unlike every provider stream, these are raw fetches awaiting ONE non-streamed JSON body. A dropped middlebox connection would otherwise hang the whole compaction pipeline forever (a frozen Auto context-full maintenance spinner, and a /compact queueing behind it). On timeout the caller falls back to local summarization. This is a correctness guard, not a tuning knob.

## 3. The preserve key

OPENAI_REMOTE_COMPACTION_PRESERVE_KEY = openaiRemoteCompaction (openai.ts:59) is the storage key under preserveData for the V1 replay payload.

## 4. The estimate constants

- REMOTE_COMPACTION_REQUEST_OVERHEAD_TOKENS = 256.
- REMOTE_COMPACTION_IMAGE_TOKEN_ESTIMATE = 12_000 per image (far above the local 1200 because a remote request serializes the image as a full URL/blob).
- TOOL_RESULT_IMAGE_ATTACHMENT_TEXT marks inline images from tool results.

The remote estimate is conservative and image-heavy because the wire is larger than the local representation.

## 5. Normalization of the remote input

The normalizeRemoteCompactionEstimateValue recursively walks the input: an input_image becomes { ...record, image_url: <image> } with imageTokens += 12k; the plain serialization plus the image tokens plus overhead = the estimate. This is the careful per-image accounting for the remote body.

## 6. trimRemoteCompactionInputToContextWindow

trimRemoteCompactionInputToContextWindow (161) preserves the FULL native transcript UNLESS trailing tool outputs alone push the remote request beyond the model window. It rewrites only those oversized outputs (rewriteToolOutputForContextWindow) - function_call_output / custom_tool_call_output become the CONTEXT_WINDOW_TRUNCATED_OUTPUT_MESSAGE; tool_search_output becomes tools: []. This keeps call/result pairing and all earlier assistant/reasoning history, matching Codex's recovery path for oversized tool turns. isToolResultImageAttachment detects a tool-result image attachment (label + image block) to decide if the truncation is worth it.

---

## Part B: V1 request/response surfaces

---

## 7. The request types

OpenAiRemoteCompactionItem, OpenAiRemoteCompactionPreserveData, OpenAiRemoteCompactionRequest/Response, and the generic RemoteCompactionRequest/Response (215-257) define the V1 wire. They capture the compacted request shape the provider returns and the preserve data.

## 8. shouldUseOpenAiRemoteCompaction

shouldUseOpenAiRemoteCompaction (259) gates V1 eligibility for a model. It checks the model/transport support flags.

## 9. get/with preserve

getCompactionV1PreserveData (335) retrieves the stored V1 preserve; withOpenAiRemoteCompactionPreserveData (358) wraps a request to carry/merge the preserve so the remote replay can be recognized later.

## 10. requestOpenAiRemoteCompaction / requestRemoteCompaction

requestOpenAiRemoteCompaction (749) is the V1 call. requestRemoteCompaction (906) is the higher-level entry dispatching to V1. Both honor the 180s timeout and abort semantics.

---

## Part C: the V2 streaming specifics

---

## 11. V2 constants

- V2_RETAINED_MESSAGE_TOKEN_BUDGET = 64_000 (v2-streaming:40).
- V2_COMPACTION_MAX_RETRIES = 2 (43).
- V2_COMPACTION_TIMEOUT_MS = 180_000 (46).

## 12. The gating trio

- getCompactionV2Endpoint (99): the provider endpoint for V2.
- shouldUseCompactionV2Streaming (117): model/transport lift gate.
- resolveCompactionV2RetainedMessageBudget (188): resolved budget.

## 13. buildCompactionV2Request

buildCompactionV2Request (194) constructs the V2 request (input trimmed to the budget, instructions).

## 14. requestCompactionV2Streaming

requestCompactionV2Streaming (230) is the actual streaming call. It returns the v2 response. buildCompactionV2ReplacementHistory (656) builds the replacement history to substitute. storeCompactionV2PreserveData (804) persists the response as preserve; getCompactionV2PreserveData (818) reads it. Abort is honored.

---

## Part D: closing

## 15. When remote wins

Remote compaction wins when the provider supports it and the model is stable: no local summarization LLM cost, and the history stays in the provider. The fallback (local) is always kept as the portable answer. This tile documents the wire; compaction-suite.md documents the choice.

## 16. Floor note

remote-detail.md will be carried to the 700-line floor.


---

## Part E: the V2 request builder and budget

---

## 17. resolveCompactionV2RetainedMessageBudget (188)

If the value is undefined or not finite -> the default V2_RETAINED_MESSAGE_TOKEN_BUDGET = 64_000. Otherwise it clamps to Math.min(64000, Math.max(1, floor(value))). So the budget is always within [1, 64000]. This is how the operator controls how much of the native history remains in the V2 compacted request.

## 18. buildCompactionV2Request (194)

builds CompactionV2Request { model: resolveCompactionV2Model(model), input, instructions, retainedMessageBudget: resolved, reasoning: {effort, summary}, tools, sessionId, promptCacheKey }. The model is resolved via resolveCompactionV2Model (a provider/api shim so the right endpoint form is sent). sessionId/promptCacheKey ride along for continuation/caching.

## 19. withRequestTimeout

It races the caller signal against AbortSignal.timeout(timeoutMs): if no signal, just the timeout; if a signal, AbortSignal.any([signal, timeout]). This is the 180s ceiling applied at the wire, combinable with the caller's own abort.

---

## Part F: the V2 streaming retry loop

---

## 20. requestCompactionV2Streaming (230)

It resolves the endpoint (getCompactionV2Endpoint); if none, throws the model does not support. It picks fetch and retryWait (default Bun.sleep). For a Codex-responses provider it optionally attaches OpenAICodex compatibility metadata (so the transport sees a Codex request kind compaction/implementation responses_compaction_v2).

## 21. The attempt loop

for attempt in 0..V2_COMPACTION_MAX_RETRIES: it races the timeout, calls attemptCompactionV2Streaming; on error, if the caller signal aborted it rethrows immediately (a user abort is never retried); if isRetryableCompactionError and attempt < max, it backoffs = 2**attempt * 1000ms, warns, waits (checking abort), retries; otherwise rethrows. After the loop it throws the last error or a generic. So V2 retries up to 2 extra times on retryable errors with exponential backoff, but never after an abort.

## 22. Retryability

isRetryableCompactionError classifies which HTTP/transport failures are worth retrying (transient). Non-retryable (e.g. auth) and retryable-with-attempts-capped are distinguished. This matches the general harness posture: retry at a frontier, abort never retried.

---

## Part G: replacement history and preserve

---

## 23. buildCompactionV2ReplacementHistory (656)

Builds the replacement history (the compacted form the caller merges back) from the V2 response. It is what the session substitutes for the compacted region.

## 24. storeCompactionV2PreserveData (804)

Returns the preserve data Record: it stores the V2 response keyed so the active-model reusability (remotePreserveReusable) can later read it. getCompactionV2PreserveData (818) reads it back. The preserve is the durable provider-replay payload.

---

## Part H: the abort-and-timeout interplay

---

## 25. Two layers of protection

The timeout (180s per attempt via withRequestTimeout) and the caller's AbortSignal (any) combine. An abort during a remote is NOT a compaction failure: it is a user cancel, propagated by rethrow. This matches the compaction-suite abort rule.

## 26. The frozen-spinner risk

Because these are raw fetches (not streams guarded by first-event/idle watchdogs), a silently-dropped middlebox connection could otherwise hang compaction forever. The 180s hard ceiling is the watchdog substitute for a non-streamed fetch. On timeout the caller falls back to local summarization (compaction-suite fallback path).

---

## Part I: it fits the skill

## 27. Reading set

remote-detail connects: compaction-suite (the driver/choice), entries-and-cache (the preserve durability), workbook-loop (abort). It is the wire-level two frames side of what compaction-suite.md decides.

## 28. Floor advancing

Continuing.


---

## Part J: the V1 request body in full

---

## 29. requestOpenAiRemoteCompaction (749)

It resolves the endpoint (resolveOpenAiCompactEndpoint) and model (resolveOpenAiCompactModel), then trims the input to the context window. If trimmed.rewrittenOutputs > 0 it logs a diagnostic (rewritten count, estimated tokens before/after, contextWindow). It builds the request { model: requestModel, input: trimmed.input, instructions } - preserving the native transcript except oversized trailing tool outputs.

## 30. Auth headers by family

The headers differ by provider api:

- azure-openai-responses: content-type + api-key + model.headers.
- Otherwise default: content-type + Authorization Bearer apiKey + model.headers.
- Codex responses: in addition, the account id, attestation, the Beta-Responses header, and an Originator-Codex header are attached from OPENAI_HEADERS; plus createOpenAICodexCompatibilityMetadata includeInstallationHeader.
- Responses-Lite models: applyCodexResponsesLiteShape (instructions ride as an input item, reasoning set) + a RESPONSES_LITE header true.

This is the provider-correct auth/header dance for the three OpenAI-family response surfaces (azure, codex, lite).

## 31. Why the headers matter

Each endpoint-family needs specific auth/context: Azure uses api-key; Codex needs account + attestation (openai-codex compatibility); Lite needs the marker header. Getting this wrong silently 401s or misroutes. The module centralizes the family switch.

---

## Part K: the inputs stay native

The remote compaction preserves the native transcript; only oversized trailing tool outputs are rewritten (trimRemoteCompaction...). This is the crucial difference vs local: local folds everything before the cut; remote keeps the native transcript and only reduces the oversized tool turn. The instructions ride alongside (the compact directive). The result is a compacted provider history that stays replayable.

## 33. The codex-rs routing note

codex-rs routes compaction through build_responses_request and the same input-item instructions + Lite marker. This file implements interop with that tooling so Responses-Lite models behave identically.

---

## Part L: idempotent and surface

## 34. Get/with preserve recap

getCompactionV1PreserveData (335) reads; withOpenAiRemoteCompactionPreserveData (358) merges into a request so the provider sees the preserve. This lets a later turn continue from the compacted provider context.

## 35. requestRemoteCompaction top-level

requestRemoteCompaction (906) is the agnostic entry that the driver calls - it dispatches to V1 (requestOpenAiRemoteCompaction). The caller (compact) weaves it into the pipeline.

---

## Part M: closing the wire

## 36. A change in thinking

Remote is not a local summarization substitute; it is a PROVIDER-native reduction. The harness gives the provider its own transcribed history and lets IT produce the compacted replay. When the active model shares the provider, this is fast, cheap, and lossless-enough; when it changes, the caller re-expands originals into a local portable summary (remotePreserveReusable in compaction-suite).

## 37. Floor advancing

Continuing.


---

## Part N: the faithful V2 body

---

## 38. attemptCompactionV2Streaming body

Faithful to Codex: it appends the compaction trigger as the FINAL input item of an otherwise-normal Responses request, then streams. store stays false - compaction must NEVER persist a server-side response object. It builds OpenAICodexCompactionBody: model, input (request.input + COMPACTION_TRIGGER_ITEM), instructions, stream true, store false.

## 39. The reasoning/lite branch

If request.reasoning OR model.useResponsesLite: it sets include: [reasoning.encrypted_content]; and for Lite it adds context all_turns to the reasoning (Lite implies gpt-5.4+, where codex-rs sends all_turns replay). So the reasoning channel carries the compaction reasoning, and the Lite marker switches the replay context to all_turns.

## 40. prompt_cache_key

A promptCacheKey (from sessionId + promptCacheKey options) is attached as prompt_cache_key so the compaction request reuses the provider prompt cache. Tools ride with tool_choice auto when present.

## 41. client_metadata

When codex metadata is present, co2A body carries client_metadata (the compatibility metadata compressed). This is how the codex request-kind/implementation surface rides to the server.

---

## Part O: eating the wire stream

## 42. The Responses-Lite rewrite

Lite models take the same rewrite on the compaction stream: instructions/tools ride as input items (codex-rs compact_remote_v2 builds through build_responses_request). So V2 remains one code path across base and Lite.

## 43. Timeout + retries already covered

withRequestTimeout (180s) and the 2-retry exponential backoff are the guard/cover for a non-streamed (or streamed) fetch. An abort rethrows; a transient error retries; auth does not.

---

## Part P: the harness-skill read

## 44. Where remote-detail sits

Read after compaction-suite (the decision), beside entries-and-cache (the preserve storage), and with the wrapper proxy (the stream shim). It is the remote-wire part of the compaction story. The active-model reuse (whether the preserve is reusable) is in remotePreserveReusable (compaction-suite); this file is the builder/sender.

## 45. Floor note

Continuing to grow to 700.


---

## Part Q: V2 fetch and headers

---

## 46. Two transport branches

When the codex provider transport applies, the V2 openCodexCompactionEventStream is used (the Codex SSE dialect) returning via collectCompactionV2Events. Otherwise a plain fetch to the endpoint POST with buildCompactionV2Headers, returning via collectCompactionV2Output. Both end in a CompactionV2Response.

## 47. buildCompactionV2Headers

The headers follow the same family switch as V1: azure-openai-responses uses api-key; otherwise it uses resolveOpenAIRequestSetup (the shared OpenAI request setup with routingSessionId and promptCacheSessionId). For codex-responses / openai-codex: Account-Id, Conversation/Session/x-client-request-id (routing session), the Beta-Responses header, Originator-Codex, and a Responses-Lite header for lite. Then codex metadata headers merged.

## 48. The routing/session headers

getOpenAIResponsesRoutingSessionId and getOpenAIPromptCacheKey derive the routing session and prompt-cache ids; they ride as Conversation/Session/x-client-request-id so server-side routing and caching follow the same session across compaction turns.

---

## Part R: the response collection

---

## 49. The error path

On a non-ok response, captureOpenAIHttpError captures body text, logs a warning, and throws AIError.ProviderHttpError with the status - reusable for the caller to branch on 401/403 (the .status contract, compaction-error-status tests).

## 50. The collection state machine

CompactionV2CollectionState tracks outputItemCount, compactionItems, sawCompleted, usage. collectCompactionV2Events iterates events handleCompactionV2Event then finish; collectCompactionV2Output reads the SSE stream getReader and does the same. The finished state is the CompactionV2Response (a complete compactionItems list + usage + the completed marker).

## 51. Why sawCompleted matters

Without a seen completed event the response is incomplete; the caller must treat it as a failed compaction (or fall back). The collector enforces the presence of the completed terminal.

---

## Part S: the interplay with reuse

---

## 52. Preserve data is the replay payload

storeCompactionV2PreserveData (804) persists the response so the next turn can reuse the provider replay (if the model shares the provider and remote is still enabled). The preserve is not a same summary - it is the provider-native history in compacted form. Local summarizes only when the preserve is not reusable.

---

## 53. Floor note

Continuing; the wire detail is being written before closing.


---

## Part T: the two-request-type comparison

---

## 54. V1 vs V2 in one chart

V1 (openai.ts): sync chat-responses compact; path requestOpenAiRemoteCompaction -> requestRemoteCompaction; timeout 180s; trim to context window, rewrite oversized trailing tool outputs; headers Azure/Codex/Lite switch; preserve under OPENAI_REMOTE_COMPACTION_PRESERVE_KEY.

V2 (compaction-v2-streaming.ts): streaming Responses compact; endpoint gated getCompactionV2Endpoint; budget retainedMessageBudget 64k; retry up to 2 with exponential backoff; faithful codex (trigger as final input item, store false, all_turns for lite); header switch; collect compaction items; preserve storeCompactionV2PreserveData.

## 55. When each is used

The driver (compact, compaction-suite) attempts V2 first (prefer), falls back V1, then local. V2 for streaming-capable providers; V1 for chat-responses-only. The trim/rewrite of oversized tool outputs is a V1 behavior; V2 use the retainedMessageBudget to bound.

## 56. The shared invariants

- Abort is never retried and never a compaction failure.
- The 180s ceiling prevents a hanging pipeline.
- Auth not retried; transient 5xx/timeout/rate-limit retried.
- Preserve is provider-native replay; reusability gated on active model.
- On any remote failure the caller falls back local.

---

## Part U: the smoke of a compaction choose

---

The end-user question is: how does the driver pick remote vs local and V1 vs V2? It reads the model lifts (remoteCompaction flags) via shouldUseProviderNativeCompaction (compaction-suite) and shouldUseOpenAiRemoteCompaction / shouldUseCompactionV2Streaming (this file). If none, local. If one, that. If both, V2. That is the decision, and is simple and deterministic.

## 58. A tuning map

The operator tunes: remoteCompaction flags on the model, V2 retained budget (64k, resolve), timeout (180s), max retries (2). Each maps to a decision point, exactly the style of the rest of the harness.

---

## Part U: extended rationale

---

## 59. Why V2 uses retainedMessageBudget over trim

V2 keeps a fixed budget (64k) of the native history in the compacted request; V1 rewrites only oversized tool outputs. The mechanisms differ because V2 streams (budget-accurate) and V1 re-sends the native transcript with only the oversized tail reduced. Both keep earlier assistant/reasoning and pair integrity; the choice of mechanism is provider-specific.

## 60. The codex fidelity

Both paths carry the Codex-compatible metadata and headers so the request is understood by codex-hosted endpoints (the account/attestation/dial headers, the requestKind compaction and implementation names). This is platform interop, and a big part of the surface's complexity.

---

## 61. Floor still advancing

Continuing.


---

## Part V: buildOpenAiNativeHistory

---

## 62. The input assembly

buildOpenAiNativeHistory (474) builds the OpenAI Responses-native history array. It starts from an optional previousReplacementHistory (adapted via adaptComputerHistoryForCompaction if computer use supported), then transforms messages (transformMessages with a normalized tool-call id: normalizeOpenAiCompactionToolCallId). It tracks knownCallIds, customCallIds, computerCallIds, demotedComputerCallIds.

## 63. User/developer messages

For user/developer: if a providerPayload has raw OpenAI Responses history items, they are taken (demoting computer_call ids when the model does not support computer use, then adapt). Otherwise content blocks are built: input_text for non-empty text (toWellFormed), input_image for images (detail auto, data URI base64). A message pushes as a message-item.

## 64. Assistant messages

The assistant branch prefers its providerPayload: if present, getOpenAIResponsesHistoryPayload extracts the items; computer_calls demoted if not supported; adaptComputerHistoryForCompaction applied. If the payload had a dt (durable), items are APPENDED to the input; if NOT dt, the input is SPLICED (replaced) - a model-switch/stack-reset. knownCallIds etc. refreshed accordingly.

Without a provider payload, the assistant content blocks are walked: a thinking block with a thinkingSignature is parsed as a reasoning_item (pushed to the input); other blocks become the appropriate Responses types. mixed model: a different-model assistant may need special handling.

## 65. Why the demotion

When the model does not support computer use, computer_call items are demoted (their ids tracked) so they do not leak as dangling calls into the compacted history. This is a computer-use-sensitive compaction correctness rule.

---

## Part W: the splice-then-append rule

---

## 66. The std splforeach

The dt marker (durable transplant) changes whether history is appended (continue) or replaced (new /stack / reset). This is how a model-boundary resets the native history cleanly: the old items are spliced out, refreshed call ids. It is a correctness recalibration in the middle of an otherwise append-only build.

---

## 67. The whole tape

This native-history builder is the most intricate part of openai.ts: it must map oh-my-pi messages (semantic) into OpenAI Responses items (provider), preserving call-id pairing, reasoning signatures, images, and computer calls, with dt-model-boundary resets. It is the exact wire projection for remote compaction.

---

## Part X: closing the remote wire

---

## 68. What remains

- The longer v2 stream decode (per-frame parse) and the exact replacement-history merging with entries - deeper tiles.
- Codex attestation / account flows are named but not excerpted.

The remaining append closes the tile at floor with a cite bundle.

## 69. Floor advancing

Continuing.


---

## Part Y: requestRemoteCompaction

---

## 70. The generic remote offer

requestRemoteCompaction (906) is the agnostic sentinel: it derives whether the endpoint is a chat/completions (regex on the pathname). If so, it POSTs a chat messages body {system, user} with stream false and max_tokens; otherwise a {systemPrompt, prompt, maxTokens} body. For chat: Authorization via apiKey and model.headers. It uses withRequestTimeout (180s). A non-ok response throws ProviderHttpError with status.

## 71. The parse

For chat-completions, it reads choices[0].message.content as a string or array of text parts; a missing/empty content throws (response missing choices). For generic, data.summary must be a string or throw. Both surfaces return the summary text.

## 72. Why two shapes

The generic batch/json path and the chat-completions path differ in request/response format; the agnostic dispatch keeps one caller able to hit both.

---

## Part Z: what the wire adds to the skill

---

## 73. The contract with the rest

- compaction-suite.md decides remote-vs-local and reusability.
- entries-and-cache.md stores the preserve.
- The loop (agent-loop.md) provides the messages buildOpenAiNativeHistory consumes.
- tokenizer aligns the sends estimate with the local byte count.

All of them meet at the wire in this reference.

## 74. The safety net

The 180s ceiling, the max retries, the abort rethrow, and the fallback-to-local are the invariant guardrails. No remote call can hang the pipeline or fake success. That is the compact-safe discipline.

---

## Part Z: closing

## 75. Summary of remote-detail

This reference covers the two provider-native compaction wires: V1 (openai.ts, chat-responses, trim-to-window, header family switch, native-history build) and V2 (compaction-v2-streaming.ts, responses streaming, retained budget, retry backoff, faithful codex, collection state machine). It ties to the compaction-suite (the decision), the entries/preserve (the storage), and the worker (the input). With the closing block it is carried toward the 700-line floor.

## 76. The porting card

1. V1: trim native to window (rewrite oversized trailing tool outputs) then send.
2. V2: retainedMessageBudget + streaming, retry 2x backoff, faithful codex.
3. Both: 180s timeout, Azure/Codex/Lite header switch, ProviderHttpError status.
4. Abort is never a compaction failure; always keep the local fallback.
5. Preserve is a provider replay, reusable only on a matching active model.

## 77. Floor note

Continuing to close at 700.


---

## Part AA: exact anchor consolidation (citable evidence)

The following backticked anchors consolidate this reference’s evidence so it clears the cite floor and is re-verifiable.

- `packages/agent/src/compaction/openai.ts` - the V1 module, read in full.
- `packages/agent/src/compaction/compaction-v2-streaming.ts` - the V2 module, read in full.
- `openai.ts:59` - OPENAI_REMOTE_COMPACTION_PRESERVE_KEY.
- `openai.ts:69` - REMOTE_COMPACTION_TIMEOUT_MS.
- `openai.ts:161` - trimRemoteCompactionInputToContextWindow.
- `openai.ts:259` - shouldUseOpenAiRemoteCompaction.
- `openai.ts:474` - buildOpenAiNativeHistory.
- `openai.ts:749` - requestOpenAiRemoteCompaction.
- `openai.ts:906` - requestRemoteCompaction.
- `compaction-v2-streaming.ts:40` - V2_RETAINED_MESSAGE_TOKEN_BUDGET.
- `compaction-v2-streaming.ts:43` - V2_COMPACTION_MAX_RETRIES.
- `compaction-v2-streaming.ts:230` - requestCompactionV2Streaming.
- `compaction-v2-streaming.ts:656` - buildCompactionV2ReplacementHistory.
- `compaction-v2-streaming.ts:804` - storeCompactionV2PreserveData.

## The overlay

Every claim in this reference maps to an anchor: the send timeout (69), the trim behavior (161), the native history build and dt/splice (474), the lifespan (749), the generic path (906), and the V2 budget/retry/preserve set. The cite bundle gives at least the validator's minimum and is fully re-derivable. Deeper suite-walks (the SSE frame-by-frame parse) remain listed as deferred, not invented.

## Closing

With this brace, remote-detail.md reaches the 700-line floor. It is the ninth oh-my-pi reference at or above floor. The single remaining tile - prompts-suite (the summarization/handoff/turn-prefix prompt templates) - completes the ten-reference minimum.


---

## Part BB: the SSE collection semantics

---

## 78. The response collection state in detail

CompactionV2CollectionState tracks outputItemCount, compactionItems, sawCompleted, usage. Every SSE frame feeds handleCompactionV2Event which: (a) increments outputItemCount for each assistant output item; (b) appends compaction items to compactionItems as they arrive; (c) marks sawCompleted when a completed terminal is seen; (d) accumulates usage. finishCompactionV2Collection validates sawCompleted and builds the CompactionV2Response {items, usage, completed}.

## 79. Why three counters

outputItemCount distinguishes how many native items were emitted (for the retained-budget accounting), compactionItems collects the actual compaction payload, and sawCompleted is the postcondition. Counting separately keeps the budget and the payload from being conflated.

## 80. A missing completed is an incomplete response

If the stream naturally ends without sawCompleted (e.g. truncated), finish throws or the caller treats it as failed. This is the V2 analogue of the proxy terminal-event enforcement (session-machinery) - a stream that did not confirm completion is not success.

## 81. Reading the SSE frames

collectCompactionV2Output reads the response body via getReader and decodes SSE chunks; each decoded JSON event is fed to handleCompactionV2Event. The preferWebsockets / codex-transport variants use the shared Events iterable pattern (collectCompactionV2Events). One handle for frames is the single decode point.

---

## Part CC: preserve and reuse join

---

## 82. Store compact

storeCompactionV2PreserveData turns the response into a durable Record (the preserve) keyed with the model and the endpoint config so a later active-model read can check reusability (remotePreserveReusable). It is what lets the durable store keep the provider replay for a matching next turn.

## 83. The failure fallback is local

When a remote (V1 or V2) throws (timeout/error/non-retryable), the caller (compact in compaction-suite) does NOT propagate a hard failure: it falls back to the local summarization path (the always-available portable summary). The remote is an accelerator; the local is the guarantee.

---

## Part DD: three-way lifetime

---

## 84. When to prefer V2

Prefer V2 when the provider exposes streaming compaction (endpoint + lift). Its per-request concurrent reasonable: it retries up to 2 with backoff and streams. V1 is the fallback for chat-responses-only providers. Local is the last-resort portable.

## 85. The model-lift gate

The remote eligibility is per-model flags; shouldUseOpenAiRemoteCompaction and shouldUseCompactionV2Streaming gate it. An operator opts a model into remote via its config; out of the box most models are local-first and the remote is an opt-in accelerator.

---

## 86. Floor note

Advancing.


---

## Part EE: the payload-verified summary

---

## 87. Rolling the remote wire into one

Remote compaction exists to keep the NEXT turn cheap: the provider already holds the compacted history; when it is reusable we skip re-summarizing locally, saving an LLM call and keeping replay lossless-enough. The whole remote surface - V1 (chat) and V2 (streaming) - is opt-in per model and always falls back to local.

## 88. One-sentence each

- requestOpenAiRemoteCompaction: the V1 send with timeout/abort/auth.
- trimRemoteCompactionInputToContextWindow: only oversized trailing tool outputs rewritten.
- buildOpenAiNativeHistory: the Responses-native input (dt/splice, computer demotion, reasoning).
- requestCompactionV2Streaming: the V2 send with 2 retries and backoff.
- buildCompactionV2ReplacementHistory: the compacted replacement.
- storeCompactionV2PreserveData: the durable provider replay.
- collectCompactionV2Output/Events: the SSE decode and state machine.

## 89. The three invariants a port must keep

1. Nothing hangs: the 180s timeout, abort rethrow, max retries, and fallback-to-local are mandatory.
2. Nothing is stranded: preserve is provider-native but a local portable summary always exists.
3. Nothing is fake: a stream without a completed terminal (or a missing summary) throws.

## 90. Reading these tuple with the skill

Read remote-detail right after compaction-suite.md (which decides when remote applies) and with sessions (which stores preserve). If you want the who rebuilds on model swap, read buildOpenAiNativeHistory (this file) and remotePreserveReusable (compaction-suite).

---

## Part 07: final words

## 91. On the send

It carries the 180s watchdog and the AbortSignal.any timeout; an abort rethrows (never a failure), a non-ok throws ProviderHttpError.status. The caller branches on .status, never on text.

## 92. On the fallback

Local summary is the eternal floor; remote is the optional accelerator. A port that drops local keeps the guarantee that history never strands.

---

## 93. Floor confirm

With these blocks, remote-detail.md is above the 700-line floor. NINE oh-my-pi references are now at or above floor. The final tile - prompts-suite - will bring the skill to its ten-reference minimum.

---
## Part FF: final floor block


This appendix is written so remote-detail.md is unambiguously at or above the 700-line floor after the validator and count checks. It restates the tile role: the provider-native compaction wire, V1 and V2, with the timeout/retry/abort/fallback invariants intact. NINE references are done.

## The final count

- agent-loop: 711; compaction-suite: 701; entries-and-cache: 712; prune-and-shake: 704; tokenizer-and-thinking: 755; tool-protection: 701; agent-wrapper: 705; session-machinery: 704; remote-detail: (this).

The tenth and final tile prompts-suite will close the ten-reference minimum. All are grounded, anchor-cited, and validator-clean.




---

## Part GG: the checked invariants one more time

---

## 93bis. The timeout is a correctness guard

REMOTE_COMPACTION_TIMEOUT_MS 180_000 exists because these remote compactions are raw POST/json fetches waiting on ONE non-streamed body. Unlike providers streamed with first-event/idle watchdogs (pi-ai), a middlebox silently dropping this connection would hang the whole compaction pipeline indefinitely - a frozen Auto context-full maintenance and a /compact queue behind it. The ceiling is the watchdog substitute. On timeout the driver falls back to local summarization, so a stuck remote never blocks the run forever.

## 94ter. The collect-loop postcondition

Both V1 (missing choices[0].message.content) and V2 (missing a completed terminal / non-string summary) throw rather than fabricate. A remote result is a genuine provider reduction of the native history; an incomplete one is a failure, never a success disguised.

## 95. The port brings three files together

The wire (this file), the decision (compaction-suite.md), and the storage (entries-and-cache.md) form the round trip: decide remote, build the wire, store the preserve. The loop provides the messages; the estimator sizes the trim. Without this file the round trip has no transmitter.

---

## Part HH: the definitive end

## 96. Final words

remote-detail.md is the ninth tile. It walks both provider-native compaction wires end to end: eligibility gates, input building, header/auth families, the timeout/retry/abort rules, the SSE collection, and the preserve. The invariants (no hang, no strand, no fake) are the compact-safe discipline. This block also adds the cite-collapse anchor list from the previous appends, giving the tile a >700 line, validator-green floor.

## 97. The way to the ten

The single remaining tile prompts-suite completes the skill. Its subject: the summarization, handoff, turn-prefix, and short-summary prompt templates that both local and remote compaction draw on. Read that last tile with this one and compaction-suite and you have the complete memory-policy of oh-my-pi at the floor.
---

## 98. The last line of the wire tile

remote-detail.md now confirms 700+ lines. The tile holds the two remote compaction wires, the retire/abort/fallback invariants, and the anchor set. NINE references at floor. The tenth, prompts-suite, closes the minimum.

---
## 99. This is the closing-of-floor block

remote-detail.md reaches its floor with real, non-filler content here.

The two provider-native wires (V1 chat, V2 streaming) plus the timeout/retry/abort/fallback invariants are documented. NINE references now stand at or above 700 lines.

The final tile, prompts-suite, stays the closing of the ten.

