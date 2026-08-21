# Roo-Code — Task Loop Reference

Complete source-grounded reference for the agent loop core (read in full during the main-session pass). Files: `src/core/task/Task.ts` (4,619 lines; class fields, request stack, and mistake-limit regions), `src/core/tools/NewTaskTool.ts`, `src/services/checkpoints/ShadowCheckpointService.ts`, `src/core/task-persistence/taskMessages.ts`, `src/core/condense/index.ts`, `src/core/context/context-management/context-error-handling.ts`.

## The Task god-object, tamed by promise gates

Task extends EventEmitter and owns everything: API handler, message state, terminal registry, MCP hub access, checkpoints, diff view, todo list. What keeps it navigable is a discipline of async-initialization PROMISE GATES on config that arrives late in `src/core/task/Task.ts` — a private `_taskMode` field paired with a `taskModeReady` Promise, plus the provider-profile twin `taskApiConfigReady`.

The field doc documents the full lifecycle: new tasks initialize mode from provider state ASYNC (falling back to defaultModeSlug), history items initialize synchronously — and states the contract outright: access only after the readiness promise resolves.

**Lesson:** when config arrives asynchronously but consumers are synchronous, publish a readiness promise next to every late field and route access through it — race conditions become impossible by construction.

## The recursive request stack

`recursivelyMakeRooRequests` in `src/core/task/Task.ts` drives turns from an explicit stack of StackItems rather than recursion. Supporting constants live in the same file head: MAX_EXPONENTIAL_BACKOFF_SECONDS=600, FORCED_CONTEXT_REDUCTION_PERCENT=75, MAX_CONTEXT_WINDOW_RETRIES=3.

> The stack starts with one item: userContent, includeFileDetails, and retryAttempt 0 — popped per turn.

Abort checks fire at the top of every iteration. Rate limiting is honored BEFORE the spinner appears, with a subtle global-slot reservation documented inline: Task.lastGlobalApiRequestTime reserves the slot early so subsequent requests (including subtasks) still honor the provider rate-limit window.

## The consecutive-mistake circuit breaker

A counter tracks model mistakes (failed tool parses, errors) with per-tool refinements — consecutiveMistakeCountForApplyDiff and ForEditFile Maps in `src/core/task/Task.ts`. When the count reaches consecutiveMistakeLimit, the loop does NOT abort — it ASKS THE HUMAN. If the user responds with guidance (messageResponse), the text is injected via formatResponse.tooManyMistakes plus images, and the counter RESETS: the human's explanation becomes the recovery fuel.

**Lesson:** runaway-loop protection should escalate to the human with a guidance channel and reset on their answer — turning a failure ceiling into a collaboration point.

## Subtask delegation: parent parks, child owns the turn

The new_task tool in `src/core/tools/NewTaskTool.ts` validates mode/message/todos (todos can be REQUIRED via VS Code settings, parsed from markdown checklists), asks approval with a JSON toolMessage, then calls delegateParentAndOpenChild — result text: Delegated to child task {childId} (no pause/unpause, no waiting). Parent/child/root links live on Task itself; hierarchical messages support escaped at-mentions.

One detail shows multi-variant hygiene: the settings namespace is Package.name — supports multiple extension variants (stable/nightly) without hardcoded strings.

**Lesson:** subtask delegation equals park the parent by id, open the child as sole active task, and return immediately — with parameter validation feeding the SAME mistake counter as other tools.

## Context-window failure handling

Constants encode policy and live in `src/core/task/Task.ts`: FORCED_CONTEXT_REDUCTION_PERCENT=75 (keep 75 percent of context, remove 25 percent on context window errors) and MAX_CONTEXT_WINDOW_RETRIES=3, plus condense integration checking checkContextWindowExceededError.

## Verification

The promise-gate pattern and mistake breaker are exercised by harvests in the task test directory; the repetition detector has direct coverage in `src/core/tools/ToolRepetitionDetector.ts` (see the approvals reference); shadow git checkpoints enforce the worktree requirement in `src/services/checkpoints/ShadowCheckpointService.ts`; message plumbing flows through `src/shared/tools.ts` and `src/core/assistant-message/NativeToolCallParser.ts`.
