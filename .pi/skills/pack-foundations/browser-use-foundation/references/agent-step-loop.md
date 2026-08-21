# Browser-Use — Agent Step Loop Reference

Source-grounded reference for `browser_use/agent/service.py` (4,166 lines). Ranges below read in full. Graph: `Agent.step` :1029-1079, `_handle_step_error` :1252-1308, `take_step` :2248-2281, `_execute_step` :2441-2502.

## WHAT: one step, one try, one finally

`step(step_info)` :1029-1079:

0. **Captcha gate** — `wait_if_captcha_solving()`; on wait, RESET step timing and inject the outcome (`ActionResult(long_term_memory=msg)`) so the LLM sees success/failure/timeout. Wrapped non-fatal.
1. **`_prepare_context(step_info)`** → browser_state_summary.
2. **Clear `last_model_output`/`last_result` AFTER context prep but BEFORE the LLM call** (:1047-1051 comment) — context prep needs them for the “previous action result” prompt section, but a timeout later must not leave stale data. The clearing point is a deliberate compromise, not an afterthought.
3. **`_get_next_action` → `_execute_actions`**.
4. **`_post_process()`**; ALL exceptions funnel into `_handle_step_error`; `_finalize(summary)` runs in `finally`.

Outer shell `_execute_step` :2441-2502 wraps step() in `asyncio.wait_for(step_timeout)`; on TimeoutError it counts a failure AND **explicitly advances `state.n_steps`** if finalize was skipped by cancellation (:2488-2491 comment) — the counter can never wedge.

## WHY the single error handler has a taxonomy

`_handle_step_error` :1252-1308 classifies instead of treating all errors alike:

- **InterruptedError = NOT an error** — user interruption is normal execution; logged as warning only.
- **Connection-like errors** — if reconnection is in progress, WAIT on the session's reconnect event (bounded), and on success record “Connection lost and recovered” and RETRY the step rather than failing it.
- **Browser closed/disconnected** — terminal: sets `stopped` + external pause event.
- **Everything else** — `consecutive_failures += 1`; log level is WARNING until the final failure (ERROR only at max), where `max_total_failures = max_failures + final_response_after_failure` (room for a graceful final reply after repeated failures).
- Parse failures (“Could not parse response”, “tool_use_failed”) get a hint about output shape — the error becomes instruction for the next attempt.

Errors land in `last_result` as `ActionResult(error=...)` so the MODEL sees them next step — errors are feedback, not just logs.

## WHERE: done detection lives above the loop

Both `take_step` :2248-2281 and `_execute_step` check `history.is_done()` AFTER the step, then optionally run a full JUDGE (`settings.use_judge`) before firing the done callback — completion claims are verified before callbacks consume them. `take_step` also executes initial actions on step 0.

**The lesson: a robust agent loop needs (a) state cleared between LLM calls, (b) an error CLASSIFIER that distinguishes interrupt/recoverable/terminal/format-feedback, (c) timeout paths that still advance counters, and (d) judged done-detection before callbacks.**
