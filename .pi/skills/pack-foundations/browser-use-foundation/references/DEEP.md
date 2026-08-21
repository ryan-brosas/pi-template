# Browser-Use Foundation — Deep Reference


# Browser-Use Foundation

A deep reference for browser-use (Gregor Zunic). MIT License. Branch `main`, commit 3c989dc (2026-08-17). Root: `/mnt/hdd/utopia/inspo/browser-use`. Graph: 5353 nodes / 28509 edges. The reference **LLM browser agent**: turn a browser DOM into a serialized state the LLM can act on, run a step loop, and let the model call typed tools. The sharpest parts: the step loop's exception containment, the DOM accessibility-tree snapshot, message compaction, and sensitive-data redaction.

## Architecture

```
browser_use/agent/service.py            -> Agent: run() / step() loop, _prepare_context, _get_next_action, _execute_actions, _post_process, _finalize
browser_use/agent/message_manager/      -> message building + maybe_compact_messages (compaction), sensitive-data filter
browser_use/agent/views.py              -> AgentSettings, AgentHistoryList, MessageCompactionSettings
browser_use/dom/service.py              -> DOM snapshot: get_dom_tree, accessibility tree, viewport ratio, iframe handling
browser_use/dom/views.py                -> EnhancedDOMTreeNode, SerializedDOMState, DOMInteractedElement, MatchLevel
browser_use/dom/serializer/             -> paint_order, html_serializer, eval_serializer, clickable_elements
browser_use/browser/session.py          -> BrowserSession: start/kill/stop, CDP session, captcha wait, chrome profiles
browser_use/tools/registry/service.py   -> Registry: @action decorator, execute_action, sensitive-data replacement, action model
browser_use/tools/                     -> extraction, service, views
browser_use/llm/                        -> litellm, mistral, base chat models
browser_use/mcp/                        -> server.py, controller.py, cli_mcp.py (expose as MCP)
browser_use/skills/                    -> install/service/views (browser automation skills)
browser_use/sandbox/                    -> sandboxed execution
browser_use/screenshots/ telemetry/ filesystem/ -> supporting services
```

Hotspots (graph): get_or_create_cdp_session (79), BaseFile.append (74), BrowserSession.start (74), AgentHistoryList.final_result (73), _history_from_events (66), Page.navigate (63). Boundaries: ci->browser (786), ci->agent (740), ci->llm (173), ci->dom (136).

## Primitive 1: the step loop (agent/service.py)

`Agent.step(step_info)` — one step of the task, with **all exceptions handled in one place**: try -> _handle_step_error -> finally -> _finalize.

- **Phase 0**: captcha wait (wait_if_captcha_solving). If waited, reset step timing and inject the outcome into last_result so the LLM sees it. Non-fatal on exception.
- **Phase 1**: `_prepare_context(step_info)` -> browser_state_summary. Then clear `last_model_output`/`last_result` BEFORE the LLM call, so a timeout in _get_next_action/_execute_actions can't leave stale data from the previous step.
- **Phase 2**: `_get_next_action(browser_state_summary)` then `_execute_actions()`.
- **Phase 3**: `_post_process()`.
- **finally**: `_finalize(browser_state_summary)`.

**The lesson: a single error handler + a finally finalizer, and clear per-step state before the LLM call so a timeout never leaks stale state.**

## Primitive 2: DOM serialization (dom/service.py + dom/views.py)

- `get_dom_tree` builds an `EnhancedDOMTreeNode` from the CDP accessibility tree (`_get_ax_tree_for_all_frames` collects all frame ids; `_get_all_trees` merges).
- **Visibility is computed from ALL parents** (`is_element_visible_according_to_all_parents`) + a viewport ratio (`_get_viewport_ratio`) + hidden-element counting in cross-origin iframes (`_count_hidden_elements_in_iframes` with a size-eligibility check `_is_cross_origin_iframe_size_eligible`).
- `SerializedDOMState` is what the LLM sees; `DOMInteractedElement` records what the agent touched.
- Serializers: `paint_order` (visual z-order), `html_serializer`, `eval_serializer`, `clickable_elements`.
- `MatchLevel` enum drives element matching.

## Primitive 3: message compaction (agent/message_manager/service.py + agent/views.py)

`MessageCompactionSettings` — the exact pattern for agent-context compaction:
- enabled (default True), compact_every_n_steps (25), trigger_char_count OR trigger_token_count (mutually exclusive — a validator raises if both set), chars_per_token (4.0), keep_last_items (6), summary_max_chars (6000), include_read_state, compaction_llm.
- Default trigger: 40000 chars (~10k tokens) when neither is set.
- `maybe_compact_messages(step_info)` is called in the message manager before building the next prompt.

## Primitive 4: the tool registry with sensitive-data redaction (tools/registry/service.py)

- `Registry(Generic[Context])` with an `@action` decorator that normalizes a function signature into a pydantic param model (`_normalize_action_function_signature`, `_create_param_model`).
- `exclude_action(name)` — prune tools.
- `execute_action` runs a tool; `create_action_model(include_actions, page_url)` builds a typed union so the LLM picks one action.
- **Sensitive-data handling**: `_replace_sensitive_data` / `recursively_replace_secrets` swap real secrets for placeholders in tool args, and `_log_sensitive_data_usage` + `collect_sensitive_data_values`/`redact_sensitive_string` (from utils) keep secrets out of the prompt/history.

## Primitive 5: browser session (browser/session.py)

- `BrowserSession.start/kill/stop` + `get_or_create_cdp_session` (fan-in 79, the hottest symbol).
- `from_system_chrome(profile_directory)` / `list_chrome_profiles()` — reuse a real Chrome profile.
- `wait_if_captcha_solving` — the captcha gate.
- `is_reconnecting`, `cloud_browser`, `demo_mode` — session modes.

## How to use

- **When you need an LLM browser agent** -> port the step loop: prepare context -> get next action -> execute -> post-process -> finalize, with one handler + a finally, and clear per-step state before the LLM call.
- **When you need a DOM the LLM can act on** -> serialize the CDP accessibility tree into an EnhancedDOMTreeNode/SerializedDOMState; compute visibility from all parents + viewport ratio; handle cross-origin iframes.
- **When you need agent-context compaction** -> MessageCompactionSettings: char OR token trigger (mutually exclusive), keep_last_items, summary_max_chars, compaction every N steps.
- **When you need a typed tool registry** -> Registry + @action decorator -> pydantic param model -> typed union action model; redact secrets to placeholders in args and history.
- **When you need to reuse a real browser profile** -> from_system_chrome / list_chrome_profiles.
- **When you need to expose the agent as MCP** -> browser_use/mcp/server.py + controller.py.

## Red Flags

- A step loop without a single exception handler + finally (state leaks or the loop dies mid-turn).
- DOM visibility computed from one parent instead of all parents (cross-origin iframes break).
- Setting both trigger_char_count and trigger_token_count (validator rejects).
- Tool args/history logged with real secrets instead of placeholders.
- Compaction that drops the last N items the model still needs.

## Verification

- A step exception is caught, logged, and the loop can continue or finalize cleanly.
- The DOM snapshot the LLM sees matches what's clickable on screen (visibility from all parents).
- Compaction triggers at the configured char/token threshold and keeps the last N items.
- Tool calls never leak secrets into the prompt or history.
- A real Chrome profile is reused across sessions.

## Skill Result Contract

```xml
<skill_result>
  <skill>browser-use-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Agent pattern ported, provenance cited, verified</evidence>
  <artifacts>Step loop + DOM serializer + tool registry</artifacts>
  <risks>State leak, secret leak, broken DOM snapshot, or none</risks>
</skill_result>
```
