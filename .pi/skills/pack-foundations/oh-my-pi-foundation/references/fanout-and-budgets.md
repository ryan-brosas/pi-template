<!-- capsule-v1 -->
# Task fanout — preserve order, release only acquired permits, steer before stopping

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/task/{index,executor}.ts`. **Question:** How does a task fanout remain deterministic under cancellation and runaway subagents?

## Source contract
**Path/Symbol:** `TaskTool.#runSyncSpawns` (1319–1381), `runSubagent` (2773–3406).
**Signature:** sync fanout returns an array in input order; subagent runner yields requests, usage, abort state, and salvage text.
**Data Shape:** spawn index, session semaphore, all-settled payloads, request budget, last assistant activity.

### Decisive source
```ts
await semaphore.acquire(workerSignal);
semaphoreHeld = true;
try { return await this.#executeSync(...); }
finally { if (semaphoreHeld) this.#releaseSpawnSemaphore(); }
```

**Flow:** allocate stable spawn positions -> acquire session permit -> run each child -> convert rejected work to an indexed result -> merge in original order -> steer once at soft budget -> force-stop at the hard ceiling.
**Invariant:** a cancelled queued child never releases a permit it did not acquire; partial work reports last useful activity rather than pretending success.
**Probe:** direct `test/task/task-spawn.test.ts:151–275` proves queue cancellation has no permit leak; `test/task/task-guards.test.ts:171–315` proves one soft notice then 1.5× hard stop and partial-output salvage.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", query: "TaskTool executeSyncFanout runSubagent request budget", limit: 16, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.coding-agent.src.task.TaskTool" });
```
