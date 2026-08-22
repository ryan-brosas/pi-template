# Agent wrapper: queue ownership and stable context

## Provenance and coverage

Source-grounded from Oh My Pi, MIT, branch `main`, commit `45e12e5`, Codebase Memory project `oh-my-pi`. `packages/agent/src/agent.ts`, `append-only-context.ts`, `pause.ts`, and `replay-policy.ts` report metadata matches. Their tests are excluded by the fast index and were searched directly.

**Porting question:** what stateful facade should own prompts, queued input, pause state, and transcript assembly around a mostly stateless loop?

## Prompt and continue have different ownership

`Agent.prompt` rejects concurrent runs, normalizes string/message/image input, and enters `#runLoop` (`packages/agent/src/agent.ts:1128-1171`). `Agent.continue` claims busy/abort state before waiting on dequeue hooks, then resumes history or drains queued work (`packages/agent/src/agent.ts:1194-1260`).

The empty-transcript path is important: queued steering or follow-up can become the opening turn; only an empty queue errors. Otherwise idle drainers can repeatedly schedule undeliverable work.

**Adopt:** explicit run-state ownership and queue draining before “nothing to continue” errors.

**Probes:** opening steer, opening follow-up, and true-empty error are pinned at `packages/agent/test/continue-empty-transcript.test.ts:14-55`; aborted dequeue ownership is pinned at `agent.test.ts:270-350`.

## Steering and follow-up are intentionally unequal

`Agent.steer` pushes to the steering queue and wakes steering waiters (`packages/agent/src/agent.ts:973-976`). `Agent.followUp` only queues for the next boundary (`packages/agent/src/agent.ts:982-984`). Modes choose all-at-once or one-at-a-time consumption (`packages/agent/src/agent.ts:917-931`).

**Adapt:** keep separate queues even if the target names them differently. Conflating them either delays urgent input or interrupts work that should finish.

**Probes:** mixed-source one-at-a-time classification (`agent.test.ts:154`) and assistant-tail queue processing (`agent.test.ts:451-526`).

## The facade translates events into durable state

Graph tracing shows `Agent.#runLoop` calling `agentLoop`/`agentLoopContinue`, appending messages, emitting events, and synthesizing paired error results (`packages/agent/src/agent.ts:1267-1686`). It tracks current stream content and pending calls for UI state, while completed messages are appended to history.

On failure, only completed/paired tool calls survive. Provider-specific server-side results are buffered until the assistant message closes so persisted ordering remains assistant tool calls followed by results.

**Adapt:** preserve the event-to-history ordering. Omit Cursor-specific buffering unless the provider executes tools server-side.

**Probe:** provider failures before and during assistant streaming still emit a balanced lifecycle (`agent.test.ts:585-630`, `1003`).

## Append-only context separates stable prefix from log

`AppendOnlyContextManager.build` combines a cached normalized system/tools prefix with log messages (`packages/agent/src/append-only-context.ts:181-185`). `takeSnapshot` copies the prompt, normalizes tools, and fingerprints the prefix (`packages/agent/src/append-only-context.ts:315-348`). Message synchronization appends deltas and rebuilds when deep history changes.

**Adopt:** stable prefix + append-only log when the provider benefits from byte-stable prompt caching.

**Adapt:** invalidate on model/tool-schema changes and any deep message mutation. Omit if the provider has no prefix cache and the added state has no measurable value.

**Probes:** cached prefix reuse (`append-only-context.test.ts:222-259`), delta sync and compaction reset (`append-only-context.test.ts:419-481`), and deep rewrite detection (`append-only-context.test.ts:514-691`).

## Pause is a gate, not an abort

`AgentPauseGate.waitUntilResumed` parks model/tool boundaries and still lets an external abort unwind (`packages/agent/src/pause.ts:25-104`). Resume/re-pause races are handled by rechecking state rather than assuming one notification grants passage.

**Adopt:** a shared pause gate at both pre-model and pre-tool boundaries.

**Probes:** model pause, mid-turn tool pause, external abort, and same-tick re-pause are pinned at `packages/agent/test/pause-gate.test.ts:34-139`.

## Replay policy stays tiny

`filterProviderReplayMessages` removes provider refusal messages using `isProviderRefusalMessage` (`packages/agent/src/replay-policy.ts:4-13`). Keep replay policy explicit and narrow; do not silently mutate durable history to satisfy one provider.

## Verification recipe

1. Race `continue()` with an abort while dequeue hooks are pending; queued ownership must remain clear.
2. Deliver steering and follow-up at active, assistant-tail, and empty-transcript boundaries.
3. Pause before a model call and during tool dispatch; resume once and re-pause in the same tick.
4. Mutate stable prefix, deep history, and tail history; assert only the necessary cache region rebuilds.
5. Replay a provider refusal and verify the durable transcript remains unchanged.

## Known limits

Session persistence, UI scheduling, remote actors, and provider-specific exec handlers live above this facade and require separate graph crowns.
