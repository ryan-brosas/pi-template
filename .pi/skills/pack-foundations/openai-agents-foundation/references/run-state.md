# OpenAI Agents — RunState Serialization & Resume Reference

Complete source-grounded reference for human-in-the-loop run persistence. File: `run_state.py` (5,492 lines; serialization, approval ledger, parking/resume, and hardened deserialization paths walked in full).

## The versioned contract: snapshots are durable artifacts

Every serialized blob is stamped `$schemaVersion` at write (:1779) and validated BEFORE anything else touches it on read (:2200-2206). The version list doubles as the changelog — `SCHEMA_VERSION_SUMMARIES` (:186-212) records each bump in prose ("1.6": "Persists explicit approval rejection messages across resume flows"; "1.15": canonical tool-invocation ledger; "1.16": exact-call decisions override sticky decisions). Unknown versions fail LOUDLY:

> "Run state schema version is not supported. Supported versions are: …" (:3838-3857)

Features gate by minimum parsed (major, minor) tuples — Programmatic Tool Calling data below 1.13 is rejected with a named error (:~3900-3917); older blobs degrade gracefully (tool_invocations rebuilt only ≥1.15, else a legacy-reconstruction flag is set).

**Lesson:** treat persisted agent state as a versioned contract — stamp every write, keep the version list as the changelog, gate features by minimum tuples, refuse unknown versions loudly.

**Probe:** tests/test_run_state.py:830-853 (missing/invalid version), :8550-8552 parametrized future versions, :9016-9018 feature-below-minimum.

## What the blob actually contains

`to_json` persists the ENTIRE loop state, not chat history (:1779-1830): current turn + owning agent (duplicate-name agents gain an `identity` key, :2447-2456), original input (Responses-API-normalized), pending input, model responses WITH usage and request_ids (request_id since schema 1.4), context entry (usage/approvals/tool_invocations/context + metadata), tool-use tracker, max_turns (nullable = unlimited), four guardrail-result lists, conversation ids, generated vs session items with dedup indexes, the parked `current_step`, last model + processed responses, trace, optional sanitized sandbox payload.

Two dedup mechanisms keep the blob honest:

- A deterministic **merge marker** — json.dumps({current_turn, last_response_id, new_items}, sort_keys=True) — prevents generated items being duplicated by the last processed response (:1583-1612, :1633-1725).
- Generated→session occurrence sharing is preserved as INDEX lists (`generated_session_item_indexes`) and re-linked after load with equality checks.

**Lesson:** a resumable snapshot must capture control-flow position, model-output provenance, decision ledgers, and item-identity indexes — history alone cannot restart an interrupted turn.

**Probe:** :352-371 round-trip asserts $schemaVersion and agent name; :1370+ exercises the merge-marker path.

## The approval ledger: scope AND precision, with the human's words attached

Local tool approvals serialize per tool as approved/rejected booleans OR call-id lists, plus optional rejection_messages and sticky fields (:1296-1320). Hosted MCP approvals serialize as sorted {identity, decision} pairs where identity is a discriminated union (server_tool | request | query) (:1337-1390). A separate canonical invocation ledger maps call_id → {type, approval_scope, fingerprint, executed, completed} (schema 1.15).

The design principle, verbatim from reject()'s docstring (:1266-1289):

> "When rejection_message is provided, that exact text is sent back to the model when the run resumes."

Approvals are security state, not UI state: a "no" must apply exactly to the offending call_id or stick to the tool deliberately, and the reason the human gave must be the reason the model sees after resume. Pre-1.15 blobs reconstruct legacy bindings from restored calls+outputs, deferring unresolvable pendings into `_restored_unbound_approval_call_ids`.

**Lesson:** serialize approvals as BOTH scope (tool-level) and precision (call-id lists) with the human's rejection text attached — and version the ledger format because its fidelity grows over time.

**Probe:** :891-904 rejection message stored; :1310+ call-scoped rejection; migration probes strip rejection_messages under 1.5 and force legacy reconstruction under 1.15.

## Parking and resuming approvals: detached snapshots, identity re-binding, ambiguity fails loud

While paused, `get_interruptions()` hands out DETACHED copies of ToolApprovalItem (:981-1051). If an item can't be safely copied, it fails closed: "Cannot safely copy pending tool approvals…" (:1008-1011). When a decision returns, the detached copy is matched back to the live item via canonical invocation identity (type, call_id, scope, fingerprint) — searched recursively through nested agent-as-tool run states — and any ambiguity RAISES:

> "Cannot apply approval because multiple current pending approvals contain the same tool invocation identity… Use unique call IDs." (:1053-1089)

The matcher is tri-state (True/False/None): None means "unsafe to distinguish," which callers treat as failure. Copy hardening extends to payloads: cyclic references raise TypeError('Cyclic tool approval payload'), non-finite numbers are rejected, and Pydantic dunder hooks (`__getattr__`, `__getattribute__`) sit in an unsafe-subtype blocklist (:250-286).

User input can be STAGED during the pause but only when a next model call is guaranteed — staging refuses terminal states, exhausted turns, accepted-but-unprocessed responses, and stop-at-tool interruptions verbatim: "Cannot add input to an interrupted RunState whose tool result may end the run" (:937-979).

**Lesson:** park approvals as immutable identity-bearing snapshots, re-bind decisions by canonical identity, stage user input only when a model call is guaranteed, and make every ambiguity a loud error.

**Probe:** :1626 detached-snapshot round-trip applies decisions; :1702 unsafe snapshots fail before return; :1921 identity collisions rejected; pending-input tests at test_run_state_pending_input.py:286/:363/:957.

## Hardened deserialization: hostile blobs are the threat model

`from_string`/`from_json` assume the snapshot may come from a database, queue, or user upload — untrusted, possibly secret-bearing:

- **Exact-type tree validation first** (:2270-2286): only dict-with-str-keys/list/str/int/float/bool/None pass, using `type(...) is` checks that bypass subclass hooks — "Validate the exact built-in JSON tree without invoking caller-defined protocols."
- **Redaction-by-default errors**: any parse/validation failure overwrites the offending string with `<redacted>`, nulls locals, and detaches tracebacks — even catching BaseException while preserving CancelledError/KeyboardInterrupt/SystemExit (:2125-2168).
- **Trusted-message allowlist** (:5402-5490): only error messages matching a hardcoded list escape redaction, and only from UserError/ValueError carrying exactly one str arg. Everything else surfaces redacted.
- Nested-history ownership refs get structural validation (non-negative indexes, len(digest)==64) THEN cryptographic verification: "Run state nested history ownership session digest does not match."

**Lesson:** treat a resumed snapshot like a web request body — validate shape with exact-type checks first, fail closed on ambiguity, and let only an allowlist of known-safe error strings escape redaction.

**Probe:** :1702-1760 unsafe-snapshot tests prove sensitive exception context is dropped; :8590-8599 parametrizes malformed inputs against allowlisted messages; a compatibility corpus (tests/fixtures/run_state/) replays real released snapshots.

## Conservative context serialization: never fake a round trip

Contexts serialize by capability tier (:1456-1549): mappings restore directly; Pydantic models dump via model_dump and dataclasses via asdict — both WARNING that the original TYPE is gone; anything else serializes to `{}` marked omitted. A machine-readable `context_meta` {original_type, serialized_via, requires_deserializer, omitted} travels in the blob so restore-time code can warn, demand a deserializer, or hard-fail under strict_context:

> "Avoid silently dropping non-mapping context data when strict mode is requested." → UserError("…Provide context_serializer to serialize custom contexts.")

Restore precedence is documented (:3861-3869): context_override → context_deserializer → direct mapping restore, with warnings or raises rather than "silently claiming that the rebuilt mapping is equivalent to the original object." RunContextWrapper SUBCLASSES are explicitly rejected. And the class_path in metadata is diagnostic only: "never auto-import it for safety."

**Lesson:** never fake a round trip you can't perform — serialize what's safe, attach machine-readable metadata describing the gap, and force callers to acknowledge it at restore time.

**Probe:** :906-937 non-mapping warns/omits + strict requires serializer; :1050-1069 pydantic metadata recorded; :651-664 duplicate identity references fail loudly.
