# Billion-Context-Pi — Watchdog Reference

(Source-grounded; read in full: `src/delegate-watchdog.ts` (100 lines).)

Source-grounded reference for `attachWatchdogs(child, hooks, opts)` (`src/delegate-watchdog.ts`, 100 lines, read in full; graph anchor :32-100). Used only on the async spawn path (`delegate-tool.ts:529`).

Supporting surface: `src/delegate-tool.ts` integrates the watchdog on the async spawn path, `src/compress-tool.ts`/`src/decompress-tool.ts` are siblings in the tool suite.

A stuck child holds its stdout fd open, so stdout EOF never fires — the module docstring states this directly. A hard timeout alone fires too late; EOF alone never fires. Hence FOUR timers.

## WHAT: the four defenses

1. **Idle timer (main)** — `poke()` = clear + re-arm on EVERY stdout data chunk; fires `killByWatchdog("no output for 5m")` after `idleMs`.
2. **Hard timeout** — armed once at attach (`timeoutMs`, async: 30m).
3. **EOF grace** — `stdout.once("end")` arms `eofTimer`; if the process hasn't exited within `eofGraceMs` (10s), fire `onEofGrace()` then SIGTERM anyway.
4. **Kill escalation** — SIGTERM, then a `killGraceTimer` SIGKILLs after `killGraceMs` (10s).

## Lifecycle correctness details (from source)

- Every timer is created with `.unref?.()` — the watchdog NEVER pins the host process alive.
- `isSettled()` is checked TWICE around escalation: once before SIGTERM and AGAIN inside the killGrace timer before SIGKILL — a run that settles during the grace window is not killed.
- `dispose()` clears all four timers AND removes the `end` listener — no leaked listeners on long-lived hosts.
- `poke` re-arms rather than stacking: clearing first means overlapping data chunks never multiply idle timers.

## Integration contract

- `isSettled: () => settled || run.status !== "running"` — any terminal status disarms.
- `onKill(reason)` records `run.timedOut = reason`; surfaces to the model as `(timed out: …)` in completion headers.
- `onEofGrace()` marks "output ended but process did not exit"; finalize afterwards treats delivered output as success even without an exit code (`effectiveCode` fallback, :611-613).

**The lesson: a hung child defeats EOF (fd held open), so idle-timeout is the primary defense; escalate TERM→KILL on a grace window; re-check settled state before every kill; unref everything.**
