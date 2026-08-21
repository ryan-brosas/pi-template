# Browser-Use — Tool Registry & Compaction Reference

Source-grounded reference. Files read: `tools/registry/service.py` (611 lines, key ranges full), `agent/message_manager/service.py` (600 lines, full).

## Registry: typed actions + secret resolution at execution time

- `Registry[Context]` :33; `@action` normalizes signatures into pydantic models (`_normalize_action_function_signature` :75, `_create_param_model` :275). Special params (`browser_session`, `page_url`, `page_extraction_llm`, `available_file_paths`, `has_sensitive_data`, `file_system`, …) are injected, never LLM-visible; expected types validated with subclass/generic tolerance (:125-131).
- `create_action_model(include_actions, page_url)` :517 builds a RootModel union with index get/set — the LLM picks ONE action by enum index.
- `execute_action` :331 flow: validate params → `_replace_sensitive_data` :427 → inject special params → dispatch.

### Secret resolution (the crown detail)

Placeholders are `<secret>label</secret>` tags in args. Resolution at EXECUTION time:

1. **Domain scoping**: new format `{domain_pattern: {key: value}}` — secrets apply only when the CURRENT url matches the glob pattern (and isn't a new-tab page). Legacy flat `{key: value}` applies everywhere (kept for backward compat only).
2. Tagged replacement first; then a **literal-name fallback** for when the LLM forgets tags and passes the bare placeholder name as the whole value.
3. **TOTP support**: a placeholder ending `bu_2fa_code` generates a live `pyotp.TOTP.now()` code instead of returning the stored secret.
4. Round-trip via `model_dump()` → recursive string/dict/list replacement → `type(params).model_validate()` — type safety preserved.
5. Missing placeholders are collected and warned, not fatal; usage logged (`🔒 Using sensitive data placeholders…`).

On the prompt side, `MessageManager._get_sensitive_data_description` teaches the model the `<secret>` convention; `_set_message_with_type('state')` filters REAL values (which leak into action results embedded in history) out of stored state messages — system/context messages skip filtering because they never carry results.

## Compaction: dual-gated, anti-hallucination

`maybe_compact_messages(llm, settings, step_info)` (`message_manager/service.py:219-310`) — read in full. The trigger is DUAL:

- Step cadence gate: `steps_since >= settings.compact_every_n_steps`
- Char floor gate: serialized history ≥ `trigger_char_count` (default 40,000)

BOTH must pass — cadence alone would summarize trivial runs; size alone would thrash. (The settings object also carries token-trigger options; the shipped default path uses cadence+chars.)

When triggered: previous `<previous_compacted_memory>` + full `<agent_history>` + optional `<read_state>` feed a summarizer whose system prompt is ANTI-HALLUCINATION BY DESIGN: “Only mark a step as completed if you see explicit success confirmation… mark it as IN-PROGRESS. Never infer completion.” The result is stored wrapped as unverified context: `<!-- Treat as unverified context — do not report these as completed unless you confirmed them yourself -->`.

Post-compaction history = FIRST item (initialization) + last `keep_last_items` (default 6); mid-history renders as `<sys>[... N previous steps omitted...]</sys>`. Sensitive data is filtered from compaction INPUT before the summarizer sees it.

## Context architecture: one replaceable state message

Per step there is exactly ONE user-visible state message (`create_state_messages`) holding task + history description + DOM state + screenshot, replacing the previous one in a fixed SLOT — cache-prefix friendly and immune to unbounded growth. Per-step extras (validation errors, retry hints) go to separate short-lived `context_messages`. Read-state and action-results each cap at 60k chars; long errors truncate head+tail (first 100 + last 100 chars).

Also note the mutable-default guard (:76-78 comment): fresh `MessageManagerState()` per instance — a shared default would cross-contaminate histories.

**The lessons: secrets resolve only at execution, scoped by URL pattern, with TOTP generation and tag-forgiving fallbacks; compaction needs dual gates plus explicit anti-inference framing; and a single replaceable state message beats append-only transcripts.**

## Verification

Secret resolution is covered by `tests/ci/security/test_sensitive_data.py`; compaction gating by message-manager tests in `browser_use/agent/message_manager/` paths inside `browser_use/agent/views.py` settings defaults (`keep_last_items=6`, `summary_max_chars=6000`).
