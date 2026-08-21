# OpenAI Agents — Turn Engine Internals Reference

Complete source-grounded reference for how a model response becomes action. Files: `run_internal/turn_resolution.py` (3,618 lines) and `run_internal/tool_execution.py` (2,776 lines), both walked in full.

## The resolution ladder: one dispatch pass, then a fixed priority chain

Every turn runs two functions. `process_model_response` (turn_resolution.py:2684) iterates `response.output` exactly once, routing each item by type into disjoint buckets: handoffs, functions, computer_actions, custom_tool_calls, local_shell_calls, shell_calls, apply_patch_calls, mcp_approval_requests, function_tools_not_found — anything display-only lands in `items`. Totality is enforced: every item lands somewhere or raises ModelBehaviorError.

Then `execute_tools_and_side_effects` (:784) resolves the buckets through a strict priority ladder:

1. tool plan execution → any interruption wins (**NextStepInterruption**)
2. handoffs beat tools (**NextStepHandoff**)
3. `tool_use_behavior`-driven final output from tool results
4. refusal detection on the last message → ModelRefusalError unless an error handler supplies output
5. structured-output schema validation of the final message, with error-handler fallback
6. plain-text final output
7. otherwise **NextStepRunAgain**

The ladder encodes the product rule: human approvals block everything; handoffs beat tools; tools can short-circuit to final output; only a bare message with no pending tool activity may become the answer.

Handoff matching is name-based but namespace-aware — "Namespaced calls never resolve to a handoff, so only bare names are matched" (:208-210). Unknown tool names either raise or, under `tool_not_found_behavior='return_error_to_model'`, become a ToolCallOutputItem the model can self-correct from (:3393-3399).

One easter egg documents a deliberate tolerance (:239-241): "Model returned a final output of None. Not raising an error because we assume you know what you're doing."

**Lesson:** model output becomes action via ONE exhaustive type-dispatch pass into typed buckets, then a fixed priority ladder ending in NextStep* variants — copy the ladder shape, not ad-hoc ifs.

**Probe:** tests/test_tool_name_collision_policy.py:842-884 parametrizes return-vs-raise for not-found tools.

## Handoff arbitration: one winner, honest losers, faithful history

If the model emits multiple handoff calls in one response, only the first executes; every loser receives a synthetic tool output reading exactly "Multiple handoffs detected, ignoring this one." (:563-573). Why fabricate outputs? Because providers reject unmatched call_ids — the losers must be answered even though they lost.

The winning handoff runs inside a handoff_span, fires hooks concurrently (`gather_with_cancel`), and produces next-turn input through an optional filter chain. Two invariants deserve porting:

- **Server-managed conversations refuse client-side history surgery**: a configured input_filter raises UserError verbatim — "Remove Handoff.input_filter or RunConfig.handoff_input_filter, or disable conversation_id, previous_response_id, and auto_previous_response_id" (:509-513); nesting silently downgrades with a warning instead.
- **Session history vs model input split** (:702-710): SingleStepResult carries BOTH `new_step_items` (full, for persistence) and optional `input_items` (filtered, for the model) — an input filter can slim what the next agent sees without corrupting durable history.

Filter results are validated before trust: non-callable → UserError; non-HandoffInputData return → UserError.

On RESUME, already-executed handoffs are filtered by call_id collected from existing HandoffOutputItems (:1985-1990), so replay never double-fires.

**Lesson:** handoffs need three guarantees — single-winner arbitration with fake outputs for losers, validated filters, and a session/model split so filtering never corrupts history.

**Probe:** assert the second ToolCallOutputItem.output equals the multiple-handoffs message; assert UserError on input filters under server-managed conversations.

## Parallel tool dispatch with failure arbitration

All function-tool calls of a turn run as asyncio Tasks created in tool-run order, optionally capped by `max_function_tool_concurrency` (slots back-fill as tasks complete). The interesting machinery activates when something FAILS:

- **isolation is default-on for batches**: `isolate_parallel_failures = len(tool_runs) > 1` (:1573-1575) — single-tool failures propagate directly, multi-tool siblings get isolated.
- On first failure, cancellable siblings are cancelled, then DRAINED for up to 0.25s while they make self-driven progress (≤64 immediate steps); post-invoke-phase siblings get a 0.1s grace window (:167-169, :1663-1700).
- Failures are ARBITRATED, not just raised: priority CancelledError(0) < Exception(1) < other BaseException(2), ties broken by dispatch order (:257-266) — "Keep the highest-priority failure, breaking ties by tool call order." The user must see the root cause, not a sibling's teardown CancelledError.
- Invocations run inside `asyncio.shield` so outer cancellation doesn't kill a tool mid-write (:2160-2196); shielded-cancel arrivals surface SIBLING failures preferentially.
- Orphaned background tasks report via done-callbacks with distinct messages per phase — nothing fails silently.
The post-invoke boundary matters mechanically: `in_post_invoke_phase` flips True after the tool returns but before guardrails (:2105), and that flag decides who is cancellable (:1716-1719).

Meanwhile the CATEGORY asymmetry is deliberate: only FunctionTool batches parallelize. Custom/shell/local-shell/apply_patch/computer executors all declare "serially" in their docstrings (:2340-2451) — side-effecting categories mutate the world where ordering is observable. On resume, committed outputs are re-sorted by their original position in the model response (:2646-2666) so history stays faithful despite out-of-order completion.

Computer actions additionally gate on acknowledged safety checks — unacknowledged → UserError before execution (:2469-2500).

**Lesson:** parallelize only the sandboxed category; give multi-tool batches an explicit failure arbiter (rank real exceptions above teardown cancellations, tie-break by dispatch order, grace-window post-invoke work, shield invocations), and re-sort emitted outputs back into model order.

**Probe:** first-of-two tools raising ValueError must surface as ValueError (not CancelledError) with the sleeper cancelled within ~0.25s (:257-308, :1663-1700); config test asserts concurrency=0 rejects at :332-334.

## Malformed input: four philosophies by consumer

Structural malformation raises precise ModelBehaviorErrors — "Shell call is missing call_id.", "Unknown apply_patch operation: {op}", etc. (:641-657, :772-818). But missing call IDs on GENERIC payloads deliberately do NOT hard-fail (:628-630): "We still guard against missing IDs to avoid hard failures on malformed or non-OpenAI inputs."

The grading:

- **Un-routable calls** degrade to model-visible error strings so the LLM self-corrects (formatter wrapped in try/except with a fallback message).
- **Approval-policy inputs fail CLOSED**: argument parsing returns None on ANY ValueError — including NaN/Infinity via `parse_constant=_reject_nonstandard_json_constant` — and `function_needs_approval` then returns TRUE (:1266-1282): an uninspectable call forces the interruption path rather than running unapproved.
- **Logging redacts by default** (:1104-1110): "Tool exceptions can embed tool call arguments or output, so the exception is redacted by default… The full exception and traceback are logged only when tool-data logging is explicitly enabled."
- Defensive alias handling shows the care level: zero timeout follows None's alias fallback because it "has no portable meaning across application-provided shell executors" (:668-669); bools are explicitly excluded from numeric checks.

**Lesson:** grade malformed-input handling by CONSUMER — raise for structure, degrade to model-visible errors for routability, fail closed for approval inputs, try/except-with-safe-default around every user callback.

**Probe:** `parse_function_tool_arguments('{"x": NaN}') is None`; an approval callable receiving unparseable args yields a ToolApprovalItem interruption, not execution.

## Resume reconciliation: identity-validated approvals and validate-before-side-effects

Resuming an interrupted run re-derives everything from persisted state (`resolve_interrupted_turn`, :1134-2935):

- Pending approvals come from serialized interruptions, filtered to the current agent, and **identity-validated**: "Persisted tool identity {persisted_key!r} does not match raw tool call {raw_identity}. Restore a consistent RunState before resuming." (:1912-1916). Mismatches re-surface ALL pending approvals as a fresh interruption rather than guessing.
- The ordering invariant is stated verbatim (:2321-2323): "Validate every current execution candidate BEFORE any dynamic approval callback or output-based replay suppression can run. This keeps a changed invocation under an approved call from being silently suppressed."
- A call-ID reuse PREFLIGHT (:3439-3535) checks the resumed response against prior invocations.
- Already-completed calls are suppressed via an output index built from pre-step items; nested Agent.as_tool() interruptions are carried over or re-bound to replacement tool objects (:2110-2133).

**Lesson:** HITL replays need identity validation on every restored artifact, validation-before-side-effects ordering, and a preflight against call-ID reuse — persisted state is a claim, not a fact.
