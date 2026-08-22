# Agent loop: live input, tool execution, and honest history

## Provenance and coverage

Source-grounded from Oh My Pi, MIT, branch `main`, commit `45e12e5` (2026-08-09), Codebase Memory project `oh-my-pi`. The fast index reports `packages/agent/src/agent-loop.ts` fresh with no recorded issue. `packages/agent/test/agent-loop.test.ts` and `soft-tool-requirement.test.ts` are excluded, so probe declarations were read directly.

**Porting question:** how can a model/tool loop accept live steering, interrupt only safe work, and leave a provider-valid transcript?

## The traced runtime seam

The graph resolves `runLoop -> runLoopBody -> executeToolCalls` with LSP-backed caller edges. `executeToolCalls` then reaches preparation, tool execution, result emission, pause, telemetry, and interrupt helpers (`packages/agent/src/agent-loop.ts:2220-2719`). Keep this seam narrow: provider streaming decides what was requested; the executor decides what may run; transcript emission records what actually happened.

**Adopt:** the separation between request parsing, dispatch, execution, and emitted history.

**Probe:** a tool batch exposes one shared batch context (`packages/agent/test/agent-loop.test.ts:424`).

## Steering uses two signals

`checkSteering` first performs a non-consuming queue check. Queued steering hard-aborts only interruptible waits and also raises a cooperative soft signal for tools that can background or stop cleanly (`packages/agent/src/agent-loop.ts:2331-2369`). The queue is drained later at the injection boundary; polling must not consume it.

This distinction prevents three failures: killing non-interruptible work, losing the steering message, and starting later batch members after the user changed direction.

**Adapt:** define interruptibility from the target tool contract, but preserve separate hard and cooperative signals.

**Probes:** direct-source tests cover skipping remaining calls (`agent-loop.test.ts:1483`), interrupting a wait (`agent-loop.test.ts:1674`), distinguishing abort from never-started skip (`agent-loop.test.ts:1746`), and keeping legacy steering queued until injection (`agent-loop.test.ts:1957`).

## Batch order is a dependency chain

`executeToolCalls` classifies each prepared call as shared or exclusive. Shared calls wait for the last exclusive call; an exclusive call waits for the last exclusive plus all active shared calls (`packages/agent/src/agent-loop.ts:2220-2719`). A throwing concurrency resolver falls back to exclusive execution.

**Adapt:** use this chain when tools declare concurrency locally. Omit it when the host already has a transactional scheduler with equivalent barriers.

**Probe:** queue a shared/shared/exclusive/shared sequence and assert overlap only within the first shared group and after the exclusive barrier.

## Results are coerced at the boundary

`coerceToolResult` accepts unknown tool output, filters unsupported blocks, preserves explicit errors/uselessness, snapshots provider metadata, and guarantees substantive text for an error (`packages/agent/src/agent-loop.ts:436-510`). This protects every provider adapter from malformed tool implementations.

**Adopt:** one coercion boundary immediately after execution, before persistence or wire conversion.

**Probes:** malformed blocks produce a valid error result; whitespace-only errors are filled so Anthropic does not reject them (`agent-loop.test.ts:4629`).

## Interrupted streams retain completed work

`retainCompletedToolCalls` filters an aborted/error assistant partial to completed tool-call IDs and labels the interruption (`packages/agent/src/agent-loop.ts:1900-1925`). Synthetic result helpers then balance calls that will never execute (`packages/agent/src/agent-loop.ts:2763-2925`). The transcript says “completed,” “aborted in flight,” or “not started”; it never fabricates successful execution.

**Adopt:** structural synthetic metadata plus paired results for every retained call.

**Probes:** recover only completed calls after a parse interruption (`agent-loop.test.ts:727`), preserve provider-error provenance (`agent-loop.test.ts:988`), and balance a gate failure (`agent-loop.test.ts:3320`).

## Soft requirements escalate without lying

The soft requirement starts as a reminder, evaluates a semantic `satisfies` predicate, may skip a detour batch, and escalates to hard tool choice only when still unmet. The direct tests pin compliance without forcing, detour escalation, predicate-based satisfaction, and state reuse across Harmony retry (`packages/agent/test/soft-tool-requirement.test.ts:72-241`).

**Adapt:** use a target-specific satisfaction predicate. Omit this mechanism if the product never promises a required action.

## Verification recipe

1. Inject steering while an interruptible and a non-interruptible tool are active.
2. Assert the message is drained once, only safe work aborts, and later work is skipped.
3. Return malformed/empty error results and assert provider-valid paired history.
4. Interrupt after one tool call completes and another only partially streams.
5. Run the soft requirement through comply, detour, and forced escalation paths.

## Known limits

This reference does not cover provider-specific Harmony parsing, Cursor server-side exec transport, telemetry, or the coding-agent UI. Re-query the live graph before extending into those areas.
