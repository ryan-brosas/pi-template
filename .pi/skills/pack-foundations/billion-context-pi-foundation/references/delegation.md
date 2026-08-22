# Billion-Context-Pi — Delegation Reference

Source-grounded reference for subagent delegation. Files: `src/delegate-tool.ts` (922 lines, read in full), `src/setup-subagent-tools.ts`, `src/delegate-events.ts`. Graph: `delegate-tool` is the fan-out hub (19 outbound calls); cluster 12 (`runDelegate/finalize/formatPayload/formatRunResult`) has cohesion 0.675.

## WHAT: three tools over one run registry

`acp_delegate` (spawn), `acp_delegate_wait` (block for result), `acp_delegate_cancel` share a module-level `runs: Map<string, DelegateRun>` (`delegate-tool.ts:122`). One DelegateRun carries `status`, `child`, `result {code,file,body}`, and the two flags that make delivery exactly-once:

- `injected?: boolean` — the close handler delivered the result as a system notification.
- `consumed?: boolean` — someone (waiter/cancel) owns the result; suppress injection.

## WHY exactly-once delivery (the sharpest design here)

An async delegate finishes AFTER its tool result already returned. Three delivery paths race:

1. **Parked waiter** — `wait()` parks `run.waiter`; close handler resolves it and it owns the result (`consumed = true`, injection suppressed).
2. **Injected notification** — no waiter: close handler calls `pi.sendUserMessage(text, { deliverAs: "followUp" })` (fire-and-forget), sets `run.injected`. Interactive/rpc sessions consume the follow-up turn.
3. **Late wait** — model calls wait after injection already fired: `injectedWaitMessage()` (:331-340) returns a short pointer to the result FILE instead of re-delivering the payload. The model never sees the same result twice.

Supporting rules: `run.result` and `run.status` are flipped TOGETHER atomically in finalize (:617-620 comment) so a concurrent wait can never observe "finished but result missing"; a second concurrent wait is REFUSED ("already has a wait in progress") because it would overwrite `run.waiter` and orphan the first waiter's timer/listener; cancelled runs persist nothing and delete their stream files.

The timeout message coaches the model too: "Do NOT keep waiting or retry — go do other work." Polling is impossible by design: there is NO status tool.

## WHERE: spawn mechanics

- Depth gate: env counter `PI_ACP_DELEGATE_DEPTH`, incremented into the child env (:504); at `MAX_DEPTH=2` spawn refused (:486-487). Env survives wrapper shells where process lineage wouldn't.
- Child = fresh pi process: same `process.execPath` + `argv[1]`; task passed via **stdin** (`child.stdin.end(args.task)` :522); role prompt written to a tmp `role.md` passed as `--append-system-prompt`; always `--no-session`.
- Mode selection (`buildChildArgs` :723-790): async + pi host → `--mode json` event stream; omp host or sync → `-p` plain reply. **Async downgrades to sync in one-shot sessions (print/json)** — injection needs a follow-up turn, which one-shot modes never observe (:510-515).
- Two stream files per run under `tmpdir()/acp-delegate`: `<runId>.out` (reply tokens) and `<runId>.activity` (tool activity, optional thinking). The agent is told ONLY about the activity file; `.out` arrives with the result — partial output is watchable without polluting chat.
- Restricted roles get `--tools <allowlist>` merged with ACP_TOOLS. The code is explicit that this is a **soft guardrail**: "it prevents accidental edit/write by read-only roles, but bash can bypass it — this is not a security boundary" (:787-792).
- Model inheritance: child gets parent's current provider/model unless overridden.
- `child.unref()` detaches so the tool returns while the child lives. The spawn-ERROR handler must finalize manually — Node does not guarantee a `close` event after `error` (EPIPE/ENOENT) (:669-687).

## Context-economy details (why results stay cheap)

- `formatPayload` sends header + 160-char task title + file path, **NO preview**: "the model uses `read` for details… Keeping this minimal means it stays cheap to retain in context (or to compress away)" (:860-865).
- Injection messages count REMAINING runs ("3 delegates still running…") so a batch dispatcher doesn't lose track (:838-843).
- Watchdog reasons surface in completion headers as `(timed out: no output for 5m)`.

**The lesson: async delegation needs an exactly-once delivery protocol (waiter XOR injection, with late-wait dedup), an env-based recursion bound, and deliberately minimal result payloads — full output lives in files, never in chat.**
