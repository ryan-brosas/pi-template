# Browser-Harness Foundation — Deep Reference


# Browser-Harness Foundation

A deep reference for browser-harness (Browser Use). MIT License. Branch `main`, commit 41108b8 (2026-08-16). Root: `/mnt/hdd/utopia/inspo/browser-harness`. Graph: 2641 nodes / 4650 edges. The companion to browser-use: a **daemon + CDP helper harness** that drives a real logged-in browser, records actions, and even composes videos from recordings. The sharpest part: the daemon attaches to the *active* browser tab and exposes simple imperative helpers (`ensure_real_tab()`, `page_info()`, `click_at_xy()`) over CDP.

## Architecture

```
src/browser_harness/run.py        -> the CLI entry: pre-imports helpers, auto-starts the daemon, HELP text
src/browser_harness/daemon.py     -> Daemon: attach_first_page, CDP websocket, enable domains, handle requests
src/browser_harness/helpers.py    -> the imperative API: cdp(), goto_url, page_info, click_at_xy, type_text, fill_input, press_key, scroll, screenshot, tabs, wait_*, js, upload_file, http_get
src/browser_harness/recorder.py   -> action recording: start_recording/stop_recording, recordings, latest, auto_enabled
src/browser_harness/video.py      -> video composition from recordings: composition, cards, narration, pacing, viewport matching
src/browser_harness/video_render.py -> render the composition
src/browser_harness/admin.py      -> ensure_daemon, restart_daemon, run_doctor, run_update, profiles, remote daemon
src/browser_harness/auth.py       -> Browser Use Cloud auth (login/logout/status, device-code for SSH)
src/browser_harness/telemetry.py, macos.py, paths.py, _ipc.py, helpers.py
agent-workspace/domain-skills/    -> browser-use-cloud skill (cleanup-zombies)
```

Hotspots (graph): cdp (18), run.main (15), Daemon.attach_first_page (12), _StreamTail.write (10), restart_daemon (10).

## Primitive 1: the daemon (daemon.py)

- **auto-start** — `ensure_daemon()` starts the daemon which connects to the running browser over CDP.
- `Daemon.attach_first_page(replaces_session=None, enable_domains=True)` — attaches to the first real page; records session replacement (stale -> replacement).
- `_enable_default_domains(session_id)` — enables the CDP domains the harness needs.
- `_close_inspect_tabs(targets)` — cleans up inspect tabs.
- **DevTools port discovery**: `_devtools_port_live(base)`, `get_ws_url()`, `_ws_from_devtools_active_port(http_url)` — finds the live remote-debugging websocket. `remote_debugging_user_enabled()` / `remote_debugging_toggle_profiles()` manage the Chrome flag.
- `is_real_page` vs `is_reusable_blank_page` vs `is_inspect_tab` vs `is_reusable_new_tab_page` — the tab-classification logic (what's worth attaching to).
- `Daemon.handle(req)` — routes CDP requests, with `tap(method, params, session_id)` for interception.

## Primitive 2: the imperative helper API (helpers.py)

Everything is pre-imported into the run namespace — the user just calls:

- **Navigation**: `goto_url(url)`, `page_info()`, `new_tab(url)`, `close_tab(target)`, `switch_tab(target, activate)`, `activate_tab(target)`, `current_tab()`, `list_tabs(include_chrome)`, `ensure_real_tab()` (the guaranteed-real-tab entry), `iframe_target(url_substr)`.
- **Interaction**: `click_at_xy(x, y, button, clicks)`, `type_text(text)`, `fill_input(selector, text, clear_first, timeout)`, `press_key(key, modifiers)`, `scroll(x, y, dy, dx)`, `dispatch_key(selector, key, event)`, `upload_file(selector, path)`.
- **Reads**: `capture_screenshot(path, full, max_dim)`, `js(expression, target_id)`, `http_get(url, headers, timeout)`.
- **Waits**: `wait(seconds)`, `wait_for_load(timeout)`, `wait_for_element(selector, timeout, visible)`, `wait_for_network_idle(timeout, idle_ms)`.
- **CDP plumbing**: `cdp(method, session_id, **params)` (the core, fan-in 18), `drain_events()`.
- `_runtime_evaluate` / `_wrap_js_function` / `_decode_unserializable_js_value` — the JS evaluation layer with unserializable-value handling.

**The lesson: expose a flat, pre-imported imperative API over a CDP daemon; classify tabs (real/blank/inspect/new-tab) so the harness always attaches to something usable.**

## Primitive 3: the recorder (recorder.py)

- `start_recording(name, title)` / `stop_recording()` — capture actions.
- `recordings()` / `latest_recording()` / `recording_dir()` — locate sessions.
- `auto_recording_enabled()` / `_auto_enabled()` — record by default.
- `_scrub_url(url)` — scrub sensitive URLs before storing.
- `_marker()` — the tab-title marker the harness prepends.

## Primitive 4: video composition (video.py + video_render.py)

The novel part: compose a video from a recording + a composition file.
- `load_composition(path)` — read the composition (cards, narration, pacing).
- `validate_narration`, `require_text`, `require_text_list`, `reject_unknown` — the strict validation of the composition schema.
- `event_at`, `event_target`, `require_matching_viewport` — match recording events to composition beats, with viewport validation.
- `card_duration`, `default_action_duration`, `duration_budget` — pacing.
- `used_frames`, `source_files`, `write_source_manifest`, `verify_source_manifest` — frame/source integrity.
- `add_raw_to_card_holds` — extend card holds with raw beats.

## How to use

- **When you need to drive a real logged-in browser** -> the daemon pattern: auto-start, attach to the active tab, enable CDP domains, expose flat helpers. Copy `ensure_real_tab()` + tab classification.
- **When you need a browser automation API** -> `helpers.py` is the model: pre-imported imperative functions over a `cdp()` core, with explicit waits (load/element/network-idle).
- **When you need action recording** -> `recorder.py`: start/stop, recordings list, URL scrubbing.
- **When you need video from browser actions** -> the composition pipeline: validate the composition strictly, match events to beats, verify viewport, render.
- **When you need to reuse a real Chrome profile** -> `admin.list_local_profiles` / `list_cloud_profiles` / `sync_local_profile`.

## Red Flags

- Attaching to a tab that isn't a real page (must classify: real vs blank vs inspect vs new-tab).
- Leaving the daemon's remote-debugging flag unmanaged.
- Recording URLs without scrubbing them.
- A video composition that skips viewport matching (beats drift from frames).
- Windows stdout/stderr without UTF-8 reconfigure (UnicodeEncodeError on tab titles).

## Verification

- ensure_real_tab() always lands on a usable page.
- page_info() returns the current page's title/url.
- click/type/fill work against the live page via CDP.
- Recordings persist and URLs are scrubbed.
- A composition renders with frames matching beats.

## Skill Result Contract

```xml
<skill_result>
  <skill>browser-harness-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Harness pattern ported, provenance cited, verified</evidence>
  <artifacts>Daemon + helper API + recorder</artifacts>
  <risks>Wrong-tab attach, unscrubbed URLs, broken composition, or none</risks>
</skill_result>
```
