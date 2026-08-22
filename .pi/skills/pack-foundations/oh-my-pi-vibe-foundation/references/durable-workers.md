<!-- capsule-v1 -->
# Vibe — durable workers are journaled child sessions, not in-memory promises

**Source:** Oh My Pi MIT `main@45e12e5`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/vibe/runtime.ts`. **Question:** How do persistent workers survive reloads without crossing parent-session ownership?

## Source contract
**Path/Symbol:** `VibeSessionRegistry.rehydrate/spawn/send/wait` (820–1211).
**Signature:** `rehydrate(session): Promise<number>`; `send(session, { session, message })`; `wait(session, { sessions?, timeoutMs?, signal? })`.
**Data Shape:** `ownerId + parentSessionId + parentSessionFile`, journal lifecycle events, in-flight job snapshot, terminal tombstone.

### Decisive source
```ts
if (record.turn) {
  if (live?.isStreaming) { await live.steer(message); return { id: record.id, mode: "steered" }; }
  record.queue.push(message); return { id: record.id, mode: "queued" };
}
const jobId = this.#registerTurnJob(session, manager, record, message, { first: false });
return { id: record.id, mode: "turn", jobId };
```

**Flow:** persist spawn -> reconstruct only matching parent scope -> steer a live worker, queue non-streaming work, or launch an idle worker -> snapshot watched job IDs -> acknowledge exactly settled deliveries.
**Invariant:** a parent switch suspends the old scope without tombstoning it; `wait()` cannot mistake a queued successor for the settled job it was asked to report.
**Probe:** direct `test/interactive-mode-vibe-toggle.test.ts:217–340` preserves same-session workers and suspends only the old parent; `test/sdk-session-isolation.test.ts:285–…` verifies exact owner-scope teardown.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", query: "VibeSessionRegistry rehydrate spawn send wait", limit: 16, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.coding-agent.src.vibe.runtime.VibeSessionRegistry" });
```
