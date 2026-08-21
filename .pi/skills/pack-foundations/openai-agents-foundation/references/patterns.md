# OpenAI Agents — Core Patterns Reference

Source-grounded reference for the framework's reusable primitives (read in full during the deep pass). Files: `src/agents/guardrail.py` (:1-110), `src/agents/handoffs/__init__.py` (:1-120), `src/agents/run_state.py` (:1-60), `src/agents/run_internal/run_loop.py` (:1-120 imports surface).

## Guardrails: parallel checks with tripwires

Every guardrail returns a `GuardrailFunctionOutput{output_info, tripwire_triggered}`. A triggered tripwire HALTS execution by raising `InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered` — an exception, not a return value, so nothing downstream can accidentally ignore it. Input guardrails run IN PARALLEL with the agent by default (`run_in_parallel=True`, :100-104): a fast classifier can cancel a slow generation without adding latency on the happy path. Setting it False gates BEFORE the model is called at all. Output guardrails run against the final output, and results carry `output_info` for tracing/explanations.

**Lesson:** safety checks should not add latency — run them parallel-by-default; stop the run with exceptions that cannot be swallowed.

## Handoffs: typed agent-to-agent delegation

A Handoff wraps a target Agent with an optional TYPED input schema (strict JSON schema via `ensure_strict_json_schema`), exposed to the calling model as a TOOL. The history problem is handled explicitly by `HandoffInputData` (:56-99): `input_history` / `pre_handoff_items` / `new_items` separated, with `input_items` letting filters REMOVE duplicates from the next agent's INPUT while keeping full items in SESSION HISTORY (:90-96) — display vs persistence made explicit. A `HandoffInputFilter` hook lets callers strip tool noise before a summarizer receives context.

Redaction-aware errors (`_invoke_handoff_with_redaction`, :38-53): ModelBehaviorErrors marked data-redacted get their tracebacks DETACHED, ctx/input scrubbed, then re-raised — secrets that tripped inside a handoff never leak through error objects. Nested handoffs get history WRAPPERS so deeply-delegated conversations stay attributable.

**Lesson:** delegation needs a session/model history split, typed schemas, and redaction-aware error propagation.

## RunState: serializable human-in-the-loop runs

`RunState` (5,492 lines; see the run-state reference for the full treatment) serializes an entire in-flight run — items, tool-invocation identity keys, approvals — so a process can die and RESUME when the human answers. Tool identity must survive serialization: lookup keys are built from namespace + qualified name (+ call id), approved items become part of the serialized graph rather than ambient memory.

## Verification

Tests anchor each primitive: `tests/test_handoffs.py`, `tests/test_guardrails.py`, `tests/test_run_state.py` (8k+ lines), and `tests/test_structure.py` pin the run_internal decomposition (`src/agents/run_internal/`).

## The reflection surface (imports tell the story)

`run_internal/` splits the loop into named concerns — `turn_preparation`, `tool_planning`, `tool_execution`, `approvals`, `guardrails`, `streaming`, `session_persistence`, `model_retry`, `error_handlers` — with MaxTurnsExceeded, ModelBehaviorError, and redacted-error plumbing as cross-cutting exceptions. Tracing spans (task/turn/agent/model) are woven at every boundary.
