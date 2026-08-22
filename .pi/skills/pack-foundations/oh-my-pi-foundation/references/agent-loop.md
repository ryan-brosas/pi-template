<!-- capsule-v1 -->
# Agent loop — steer safely, retain only paired work

**Source:** Oh My Pi MIT `main@45e12e5`; Codebase Memory `oh-my-pi`. **Question:** How can live input interrupt tool work without stealing a later follow-up or emitting invalid provider history?

## 1. Observe steering; dequeue only at the boundary
**Path/Symbol:** `packages/agent/src/agent-loop.ts:checkSteering` (2331–2369), `executeToolCalls` (2220–2742).
**Signature:** `checkSteering(): Promise<void>`; `executeToolCalls(currentContext, assistantMessage, signal, stream, config, telemetry, span)`.
**Data Shape:** steering queue state, hard abort signal, cooperative soft signal, per-call record.

### Decisive source
```ts
const queuedState = await hasSteeringMessages(); // observation only
steeringQueued = typeof queuedState === "boolean"
  ? queuedState
  : queuedState.queued;
if (steeringQueued && !steeringAbortController.signal.aborted) {
  steeringAbortController.abort(); // interruptible waits
  steeringSoftController.abort(); // cooperative work
}
```

**Flow:** subscribe -> check non-consuming queue -> hard-abort waits / soft-signal work -> skip unstarted calls -> boundary dequeues steering.
**Invariant:** polling never consumes a follow-up; a second poll is idempotent.
**Probe:** direct `packages/agent/test/agent-loop.test.ts:1674–1746` aborts an interruptible wait and injects the steer; `:1746–` distinguishes an in-flight abort from a never-started skip.

## 2. Normalize results before replay; retain only completed pairs
**Path/Symbol:** `coerceToolResult` (436–510), `retainCompletedToolCalls` (1900–1925).
**Signature:** `coerceToolResult(raw): { result, malformed }`; `retainCompletedToolCalls(message, completedToolCallIds)`.
**Data Shape:** unknown tool payload -> typed content blocks; completed call-ID set -> filtered assistant tool calls.

### Decisive source
```ts
if (!Array.isArray(rawContent)) return {
  result: { content: [{ type: "text", text: "Tool returned an invalid result: missing content array." }], isError: true },
  malformed: true,
};
if (isError && !hasSubstantiveToolResultContent(content)) {
  content.length = 0;
  content.push({ type: "text", text: EMPTY_ERROR_TOOL_RESULT_TEXT });
}
```

**Flow:** validate unknown blocks -> make errors non-empty -> attach result to call ID -> on error/abort drop unfinished call declarations.
**Invariant:** every retained result has its call; malformed error output is serializable and non-empty.
**Probe:** direct `agent-loop.test.ts:700–770` retains only a completed call after parse failure; `:4600–4680` proves whitespace-only error output becomes `Tool failed with no output.`.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.check_index_coverage({ project: "oh-my-pi", paths: ["packages/agent/src/agent-loop.ts"] });
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(coerceToolResult|executeToolCalls|retainCompletedToolCalls)$", limit: 8, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.agent.src.agent-loop.executeToolCalls" });
```
