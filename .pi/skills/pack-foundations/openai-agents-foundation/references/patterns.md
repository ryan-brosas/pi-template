# OpenAI Agents (Python) — Core Patterns Reference

Source-grounded reference. Read: `guardrail.py` (:1-110), `handoffs/__init__.py` (:1-120), `run_state.py` (:1-60), `run_internal/run_loop.py` (:1-120 imports surface). Graph: 28,011 nodes / 202,610 edges.

## 1. Guardrails: parallel checks with tripwires

- **WHO** — applications that must reject off-topic/harmful input or invalid output BEFORE it propagates.
- **WHAT** — functions returning `GuardrailFunctionOutput{output_info, tripwire_triggered}`; a triggered tripwire HALTS execution by raising `InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered` (`guardrail.py`).
- **WHEN** — input guardrails run IN PARALLEL with the agent by default (`run_in_parallel=True` :100-104) so a fast classifier can cancel a slow generation; set False to gate BEFORE the model is called at all. Output guardrails run against the agent's final output.
- **WHERE** — dataclasses :17-64, InputGuardrail :66-108; queue-based streaming variants in `run_internal/guardrails.py` (`run_input_guardrails_with_queue`).
- **WHY** — *parallel-by-default* means safety checks don't add latency on the happy path; the tripwire EXCEPTION (not a return value) is what stops the run, so nothing downstream can accidentally ignore it. Results carry `output_info` for tracing/explanations.

## 2. Handoffs: typed agent-to-agent delegation

- **WHO** — multi-agent systems where one agent routes work to a specialist.
- **WHAT** — a Handoff wraps a target Agent with an optional TYPED input schema (strict JSON schema enforced via `ensure_strict_json_schema`), exposed to the calling model as a TOOL (`handoffs/__init__.py`).
- **WHEN** — the calling model invokes the handoff tool; `invoke_handoff` validates input JSON, swaps the active agent, and optionally filters conversation history.
- **WHERE** — `HandoffInputData` :56-99, redaction wrapper :38-53, history nesting :14/:121+ (`nest_handoff_history`, conversation-history wrappers).
- **WHY** —
  - *History is the hard part*: `HandoffInputData` separates `input_history` / `pre_handoff_items` / `new_items`, and `input_items` lets filters REMOVE duplicates from the next agent's INPUT while keeping full items in SESSION HISTORY (:90-96) — display vs persistence divergence made explicit.
  - *HandoffInputFilter* is a first-class hook (TypeAlias :102-103) — e.g., strip tool noise before a summarizer agent receives context.
  - *Redaction-aware errors*: `_invoke_handoff_with_redaction` (:38-53) catches ModelBehaviorErrors marked "data redacted", DETACHES their tracebacks, scrubs ctx/input references, and re-raises — secrets that tripped inside a handoff never leak through error objects.
  - Nested handoffs get history WRAPPERS so deeply-delegated conversations stay attributable.

## 3. RunState: serializable human-in-the-loop runs

- **WHO** — applications pausing agent runs for approvals (the 5,492-line module).
- **WHAT** — full serialization of an in-flight run (items, tool-invocation identity keys, approvals) so a process can die and RESUME when the human answers.
- **WHEN** — tool calls requiring approval park the run; `McpApprovalRequest`/`FunctionCallOutput` items round-trip through storage.
- **WHERE** — docstring :1, tool-identity key builders imported :44-58 (`build_function_tool_lookup_map`, serialize/deserialize lookup keys), invocation identity/scope helpers :59-60.
- **WHY** — *tool identity must survive serialization*: lookup keys are built from namespace + qualified name (+call id) so a resumed run matches pending calls to the right tools even across process restarts; approval state is part of the serialized graph rather than ambient memory.

## 4. The reflection surface (imports tell the story)

`run_internal/` splits the loop into named concerns — `turn_preparation`, `tool_planning`, `tool_execution`, `approvals`, `guardrails`, `streaming`, `session_persistence`, `model_retry`, `error_handlers` — with MaxTurnsExceeded, ModelBehaviorError, and redacted-error plumbing as cross-cutting exceptions. Tracing spans (task/turn/agent/model) are woven at every boundary.
