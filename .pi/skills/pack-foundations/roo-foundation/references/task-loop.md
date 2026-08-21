# Roo-Code — Task Loop Reference

Studied regions walked during the main-session pass: `src/core/task/Task.ts` (class fields, request stack, mistake-limit enforcement), `src/core/tools/NewTaskTool.ts` (subtask delegation), `src/core/context-management` (condense wiring), `src/services/checkpoints/ShadowCheckpointService.ts` (shadow git).

Complete source-grounded reference for the agent loop core. File: `src/core/task/Task.ts` (4,619 lines; head, class fields, request-stack, and mistake-limit regions walked).

## The Task god-object, tamed by promise gates

Task extends EventEmitter and owns EVERYTHING: API handler, message state, terminal registry, MCP hub access, checkpoints, diff view, todo list. What keeps it navigable is a discipline of async-initialization PROMISE GATES on config that arrives late:

```ts
private _taskMode: string | undefined
private taskModeReady: Promise<void>
```

The field doc (:176-215) documents the full lifecycle — new tasks initialize mode from provider state ASYNC (falling back to defaultModeSlug), history items initialize synchronously — and states the contract outright: "This property should NOT be accessed directly until taskModeReady promise resolves." The same pattern gates the provider-profile name (`taskApiConfigReady`).

**Lesson:** when config arrives asynchronously but consumers are synchronous, publish a readiness promise next to every late field and route access through it — race conditions become impossible by construction. (The gate pattern also appears in `src/core/config/ProviderSettingsManager.ts` for provider profiles.)

Supporting constants live in `src/core/task/Task.ts` head: MAX_EXPONENTIAL_BACKOFF_SECONDS=600, FORCED_CONTEXT_REDUCTION_PERCENT=75, MAX_CONTEXT_WINDOW_RETRIES=3; persistence via `src/core/task-persistence/taskMessages.ts` (saveTaskMessages/readTaskMessages); condensation via `src/core/condense/index.ts` (summarizeConversation).

## The recursive request stack

`recursivelyMakeRooRequests` (:2470+) drives turns from an explicit stack of StackItems rather than recursion:

> `const stack: StackItem[] = [{ userContent, includeFileDetails, retryAttempt: 0 }]` … `while (stack.length > 0) { const currentItem = stack.pop()!`

Abort checks fire at the top of every iteration (`task ${taskId}.${instanceId} aborted`). Rate limiting is honored BEFORE the spinner appears, with a subtle global-slot reservation documented inline: "We also set Task.lastGlobalApiRequestTime here to reserve this slot before we build environment details (which can take time). This ensures subsequent requests (including subtasks) still honour the provider rate-limit window."

## The consecutive-mistake circuit breaker

A counter tracks model mistakes (failed tool parses, errors) with per-tool refinements (`consecutiveMistakeCountForApplyDiff` / `ForEditFile` Maps, :318-319). When count reaches `consecutiveMistakeLimit` (:2483), the loop does NOT abort — it ASKS THE HUMAN:

> `await this.ask("mistake_limit_reached", t("common:errors.mistake_limit_guidance"))`

If the user responds with guidance (messageResponse), it's injected as `{ type: "text", text: formatResponse.tooManyMistakes(text) }` plus images, and the counter RESETS — the human's explanation becomes the recovery fuel. Exponential backoff caps at MAX_EXPONENTIAL_BACKOFF_SECONDS=600.

**Lesson:** runaway-loop protection should escalate to the human with a guidance channel and reset on their answer — turning a failure ceiling into a collaboration point.

## Subtask delegation: parent parks, child owns the turn

`NewTaskTool` validates mode/message/todos (todos can be REQUIRED via VS Code settings, parsed from markdown checklists), asks approval with a JSON toolMessage, then calls `delegateParentAndOpenChild({parentTaskId, message, initialTodos, mode})`. The result is honest about the semantics: "Delegated to child task {childId}" — no pause/unpause, no waiting. Parent/child/root links live on Task itself (:186-190); hierarchical messages support `\@` escaping (un-escaped one level per spawn).

One detail shows multi-variant hygiene: the settings namespace is `Package.name` ("Supports multiple extension variants (e.g., stable/nightly) without hardcoded strings").

**Lesson:** subtask delegation = park the parent by id, open the child as sole active task, and return immediately — with parameter validation feeding the SAME mistake counter as other tools.

## Context-window failure handling

Constants encode policy: FORCED_CONTEXT_REDUCTION_PERCENT=75 ("Keep 75% of context (remove 25%) on context window errors"), MAX_CONTEXT_WINDOW_RETRIES=3, plus condense integration (`summarizeConversation`, `getMessagesSinceLastSummary`) and a dedicated context-error-handling module checking `checkContextWindowExceededError`.
