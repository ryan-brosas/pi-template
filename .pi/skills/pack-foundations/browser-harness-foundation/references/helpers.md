# Browser-Harness — Helper API Reference

Source-grounded reference for `src/browser_harness/helpers.py` (539 lines, read in full). Every public helper is transparently wrapped by `run.py:_traced` (duration/errors → trace + `recorder.observe`) — helpers themselves know nothing about recording or telemetry.

## Core plumbing

- `cdp(method, session_id=None, **params)` :53-55 — THE core (fan-in 18): wraps `_send` (connect/request/close per call, 5s timeout, raises RuntimeError on error field).
- JS evaluation layer: `_runtime_evaluate` :113-118 (returnByValue + awaitPromise), `_runtime_value` :94-110 (raises with line/col + expression snippet on exceptionDetails), `_decode_unserializable_js_value` :80-91 (NaN/Infinity/-0/BigInt round-trip), `js()` :460-474 — evaluates as-is FIRST and retries inside a function wrapper only on “Illegal return statement”, so both `document.title` and `const x=1; return x` work without mis-wrapping nested returns.

## The input problem (why fill_input exists)

`type_text` uses `Input.insertText` — which BYPASSES framework listeners, leaving React controlled inputs and submit buttons stale. `fill_input(selector,text)` :177-214 fixes this: focus via JS → select-all via RAW `rawKeyDown`/`keyUp` (NOT press_key: with Ctrl/Cmd held, press_key's extra `char` event makes Chrome treat “a” as printable text, leaving the field uncleared) → Backspace → per-character `press_key` → synthetic `input`+`change` events so frameworks see it.

`press_key` :224-235 carries `windowsVirtualKeyCode`/`code` so listeners checking e.keyCode fire; the `char` event fires only for printable chars WITHOUT Alt/Ctrl/Meta modifiers (modifier+key = shortcut).

## Waits (each fixes a distinct SPA failure)

| Helper | Anchor | Fixes |
|---|---|---|
| `wait_for_load` | :387-393 | polls readyState — misses SPAs that render after 'complete' |
| `wait_for_element(visible=True)` | :395-423 | uses `checkVisibility()` which walks ANCESTORS (display:none/opacity on parents); getComputedStyle on the element alone misses inherited hiding |
| `wait_for_network_idle(idle_ms=500)` | :425-458 | tracks Network.requestWillBeSent/loadingFinished inflight set; FILTERS events to the active session — a background polling/SSE tab previously attached would otherwise poison the idle window |

## Tab management

- `switch_tab(target, activate=False)` :308-326 — attaching ≠ taking over the visible tab (intentional separation from `activate_tab` :298-306); unmarks 🐴 from the old title, attaches, `set_session` to daemon, marks new tab.
- `new_tab(url)` :328-350 — creates BLANK then navigates: passing url to createTarget races with attach, making wait_for_load return before navigation starts. Reuses the attached blank/NTP tab when possible.
- `ensure_real_tab()` :361-373 — no-op when current tab is real; switches to first real tab otherwise.
- `_target_id` accepts raw ids OR dicts from list_tabs/current_tab so `switch_tab(current_tab())` just works.

## Misc sharp edges

- `page_info()` :137-147 returns `{dialog:{...}}` INSTEAD of page data when a native alert/confirm/prompt is open — the page's JS thread is frozen until handled.
- `capture_screenshot(max_dim=1800)` :242-254 downsizes for 2× displays to stay under 2000px-per-side limits some image-aware LLMs enforce.
- `http_get` :498-515 routes through fetch-use proxy (bot detection/residential proxies) when `BROWSER_USE_API_KEY` is set, local urllib otherwise; gzip handled manually.
- `goto_url` attaches domain-skills hints (per-hostname markdown dirs) into the result when `BH_DOMAIN_SKILLS=1`.

**The lesson: each helper encodes one specific browser/platform failure mode — insertText bypasses frameworks, readyState lies for SPAs, visibility is inherited, attach ≠ activate, createTarget-with-url races attach. Port the lessons, not just the functions.**
