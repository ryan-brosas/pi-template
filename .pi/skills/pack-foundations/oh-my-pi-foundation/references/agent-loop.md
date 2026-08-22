<!-- capsule-v1 -->
# Agent loop: live steering and tool-result safety

**Provenance:** Oh My Pi (MIT) main @45eaa; Codebase Memory project oh-my-pi. agent-loop.ts source-covered; agent-loop.test.ts fast-index excluded (direct probes).
**Porting question:** during tool execution, how do you steer or interrupt without orphaning results or serializing malformed tool output?

## Capsule: steering is observed before it is consumed
**Path/Symbol:** packages/agent/src/agent-loop.ts:checkSteering (2331-2369), executeToolCalls (2220-2742).
**Signature:** checkSteering(): void; executeToolCalls(currentContext, assistantMessage, signal, config): void.
**Data Shape:** live steering messages are queue-owned; tool execution has its own abort signal and the assistant message being resolved.
**Flow:** batch starts -> observe steering/abort without dequeuing follow-up ownership -> soft vs hard -> stop/continue -> append paired results.
**Porting shape:** observe steering+abort; if hard: stop active work, preserve finished pairs; if soft: schedule next boundary; execute pending; append each result beside its call.
**Invariant:** observing steering does not consume a later follow-up's message; interrupted turns retain only completed call/result pairs.
**Probe:** agent-loop.test.ts:1674,1746 (steering/interrupt), :727 (completed retention), :4629 (coercion).
**Retrieve:** graph-search the two symbols, read snippets, direct-read the tests.

## Capsule: tool results are made serializable before provider replay
**Path/Symbol:** agent-loop.ts:coerceToolResult (436-510), retainCompletedToolCalls (1900-1925).
**Flow:** tool returns unknown -> normalize to provider-safe result content -> attach to its call id -> on interruption keep only completed ids + their outputs.
**Invariant:** every retained result has its call; a malformed result becomes non-empty before provider serialization.
**Retrieve:** graph the symbols, read their source windows + named excluded tests.