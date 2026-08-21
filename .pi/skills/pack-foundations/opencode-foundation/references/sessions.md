# OpenCode — Session Engine Reference

Complete source-grounded reference for the session engine. Files: `packages/opencode/src/session/session.ts` (1,019 lines), `session/prompt.ts` (1,631 lines), `session/processor.ts` (718 lines) — all walked in full.

## Persistence: writes are events, reads are paginated projections

The engine never touches storage directly. Every mutation publishes an event through the bridge: `updateMessage` is literally just `events.publish(SessionV1.Event.MessageUpdated, …)` returning the message unchanged (:630-636); `updatePart` publishes with a defensive `structuredClone(part)` so downstream code can't mutate an already-published snapshot (:637-644); streaming deltas publish ONLY a PartDelta event — no DB write at all (:879-887).

Reads bound memory on long sessions via cursor pagination: `messages()` pages 50 at a time, pushes items in reverse, then reverses once at the end to restore chronological order (:830-853). `findMessage` walks newest-first until a predicate matches (:890-907).

**Lesson:** make writes events and reads paginated projections — durability strategy can then change without touching agent logic.

**Probe:** updatePartDelta emits exactly one PartDelta per text-delta and no DB write; messages() returns chronological order for >50 messages (the double-reverse path).

## Forking is a graph rewrite

A conversation is a DAG of id references — message.parentID, part.messageID, compaction parts' tail_start_id. `Session.fork` (:693-733) replays every message up to the target, minting fresh ascending ids while threading an `idMap` that rewrites EVERY cross-reference:

> `if (p.type === "compaction" && p.tail_start_id) { p.tail_start_id = idMap.get(p.tail_start_id) }` (:722-724)

That compaction remap is the easy one to miss; missing it leaves dangling pointers that break context reconstruction on the next model call. Metadata deep-copies via structuredClone; forked titles suffix `(fork #N)` by regex.

**Lesson:** cloning a conversation is a graph rewrite — enumerate and remap every cross-reference field or the fork silently corrupts on its next turn.

**Probe:** fork mid-conversation containing a compaction part; assert no clone part references an id outside the new session's set.

## Patch semantics defined once: absent=keep, null=clear

`Session.patch` (:736-753) merges nested objects shallowly and treats explicit `null` as CLEAR (`share: info.share === null ? undefined : …`). The Patch type encodes it in its shape: fields are `Partial<…> | null`. Every set* mutator derives from this one merge and stamps `time.updated` — except setTitle/setArchived which preserve caller time semantics.

**Lesson:** define patch semantics once (absent=keep, null=clear) and derive all mutators from it — ad-hoc per-field merge logic is where stale-state bugs breed.

**Probe:** setRevert → clearRevert must leave revert undefined AND advance time.updated; patching `{time:{updated}}` alone must not clobber revert/share/permission.

## Prompt assembly: attachments become synthetic tool transcripts

User input parts resolve BEFORE persistence into ordinary model-message shapes (:635-1050). File parts become fake Read-tool transcripts — synthetic parts reading "Called the Read tool with the following input: {…}" followed by output from the REAL Read tool executed with `bypassCwdCheck: true` (:826-903), including LSP symbol-range expansion from URL start/end params. MCP resources get size/mime guards producing `[Binary MCP resource omitted: …]` placeholders over a 10MB cap. Everything resolved is marked `synthetic: true`; an agent part appends an instruction to call the task tool with the named subagent.

Pre-save validation logs schema failures ("invalid user message before save") WITHOUT aborting the save — drift degrades gracefully instead of dropping user input.

System prompts assemble fresh EACH loop step from four layers (env + instructions + MCP instructions + skills, :1256-1262), plus a structured-output prompt for json_schema mode and a MAX_STEPS_PROMPT injected as a trailing assistant message on the final step.

**Lesson:** normalize exotic user input into the same shape as ordinary tool traffic — one code path for the model beats special-casing attachments forever.

**Probe:** a file part with symbol URL params must emit Read args carrying expanded offset/limit; oversized binary MCP blobs produce the omission placeholder.

## The stream processor: untrusted event soup under guard

`SessionProcessor.handleEvent` is a total switch over LLM events (:296-537): reasoning/text accumulators flush deltas per token; tool-input events ensure pending ToolParts exist; step-finish records usage/cost, emits patches, forks async summarization, and sets needsCompaction on overflow.

Three guards stand out:

- **Doom-loop detection**: three identical consecutive tool calls trigger a permission ask (`DOOM_LOOP_THRESHOLD = 3`, :29, :355-383).
- **No tools during summary**: "Tool call not allowed while generating summary" (:315-334).
- **Snapshot race** (:98-100): state snapshots capture BEFORE the stream starts because "the AI SDK may execute tools internally before emitting start-step events, so capturing inside the event handler can be too late."

Context overflow becomes a stream-control decision, not an exception: `Stream.takeUntil(() => ctx.needsCompaction)` cuts mid-flight (:643-645) and process() returns Result = "compact" | "stop" | "continue" for a controlled compact-and-retry cycle.

**Lesson:** treat the LLM stream as untrusted event soup — guard it with invariants (doom-loop threshold, no-tools-in-summary), capture external-world state before the stream starts, and make compaction a stream-control decision rather than an exception.

**Probe:** three identical tool-call events fire a doom_loop ask; ContextOverflowError mid-stream still yields completed step-finish parts and Result='compact'.

## Abort handling: tombstones plus orphan filtering

Interruption can strike at any await, so abort is designed as state-machine transitions with explicit tombstones:

1. Assistant finalizers wrap both processor creation and step outcome with `Effect.onInterrupt`, stamping `msg.error ??= fromError(AbortError, {aborted:true})` and completing the message (:1203-1210).
2. Processor cleanup waits up to 250ms per outstanding tool Deferred, then force-marks leftovers `status:"error", metadata:{interrupted:true}` (:573-592).
3. The LOOP EXIT guard filters those tombstones out of continuation logic (:1103-1111):

> "Some providers return 'stop' even when the assistant message contains tool calls. Keep the loop running so tool results can be sent back to the model, but ignore cleanup-marked interrupted orphans." — implemented as `isOrphanedInterruptedTool` (:96-100): "They are not pending work and must not trigger an assistant-prefill request."

Shell commands run under uninterruptibleMask with interruption detected from the Exit cause, appending a literal `<metadata>User aborted the command</metadata>` block. Content-filter finishes surface as ERRORS — "previously the session went idle silently" (:1300-1312).

**Lesson:** design abort as state-machine transitions with explicit tombstones (interrupted:true), then make every consumer of history filter tombstones — never let a cancelled turn poison the next turn's context.

**Probe:** cancel mid-stream with a slow tool → assistant carries AbortError, tool part carries interrupted:true, and the next prompt() does NOT resend the orphaned tool_use (loop-exit warning logged).
