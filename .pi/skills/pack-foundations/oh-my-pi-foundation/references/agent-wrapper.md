<!-- capsule-v1 -->
# Agent wrapper: queue ownership and durable context

**Provenance:** Oh My Pi (MIT) main @45eaa; packages oh-my-pi.
**Provenance:** Oh My Pi (MIT) main @45eaa; Codebase Memory project oh-my-pi. agent.ts, append-only-context.ts, replay-policy.ts source-covered; pause-gate freshness missing -> direct-read before port.
**Porting question:** how a public facade assigns ownership to prompt, steer, continue, follow-up, pause, and durable context without races.

## Capsule: public entry points choose the next safe boundary
**Path/Symbol:** packages/agent/src/agent.ts:Agent.prompt/continue/steer/followUp (own the queue).
**Signature:** facade methods own queue items; steer signals the active run without stealing follow-up ownership.
**Flow:** prompt owns initial work -> steer wakes the active run at the next boundary -> followUp waits for that boundary -> continue resumes only a valid transcript (incl. empty case).
**Data Shape:** active run, steering queue, queued follow-ups, and the transcript boundary are separate ownership domains.
**Invariant:** live input changes the current run without consuming next-run ownership.
**Probe:** continue-empty-transcript.test.ts:14-55; agent.test.ts:270-350 (queue/abort).

## Capsule: pause, replay, append-only guards preserve durable state
**Path/Symbol:** agent-pause-gate.ts:waitUntilResumed (25-104); replay-policy.ts:filterProviderReplayMessages (4-13); append-only-context.ts:takeSnapshot (315-348).
**Flow:** park run -> abort unwinds that run without releasing the gate globally -> filter provider-safe messages -> snapshot stable prefix before tail rewrite/compaction.
**Porting shape:** await gate(signal); if aborted {unwind run; keep gate state}; replay=filter(history); snap=snapshot(prefix,tail).
**Invariant:** cancellation is run-scoped, not process-wide; neither replay filter nor snapshot mutates canonical transcript in place.
**Probe:** pause-gate.test.ts:34-139 (external abort won't release the gate); append-only tests validate snapshot/tail.
**Retrieve:** coverage-check the three paths; pause-gate freshness missing -> direct source read before reuse.