---
name: browser-harness-foundation
description: "Use when building browser automation tooling: a CDP daemon that attaches to a real browser, high-level page helpers, action recording, and video composition from recordings."
disable-model-invocation: true
---
---
name: browser-harness-foundation
description: "Use when building browser automation tooling: a CDP daemon that attaches to a real browser, high-level page helpers, action recording, and video composition."
disable-model-invocation: true
---

# Browser-Harness Foundation

## Solves
A daemon + CDP helper harness that drives a real logged-in browser, records actions, and composes videos from recordings. Sharpest part: the daemon attaches to the active tab and exposes simple imperative helpers.

## When to use
Building browser automation tooling: a CDP daemon, page helpers, action recording, video composition.

## Key skill-lines
- Drive a real logged-in browser -> the daemon pattern: auto-start, attach to a classified tab (real/blank/newtab/inspect), enable CDP domains in PARALLEL (fits the 5s IPC budget), expose flat helpers over one `cdp()` core.
- Recover from stale CDP sessions -> session-replacement CHAINS + retry-only-on-known-replacement; never silently redirect an explicit session to the daemon's current tab.
- Browser automation API -> `helpers.py`: pre-imported imperative functions over a cdp() core, explicit waits (load/element/network-idle).
- Action recording -> `recorder.py`: start/stop, recordings list, URL scrubbing.
- Video from browser actions -> the composition pipeline: validate composition strictly, match events to beats, verify viewport, render.

## Full view (memory graph)

Indexed in Codebase Memory as **`browser-harness`** (`/mnt/hdd/utopia/inspo/browser-harness`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "browser-harness", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "browser-harness", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "browser-harness", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "browser-harness", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — architecture map, admin/auth surface, red flags, verification.
- `references/daemon.md` — Daemon internals: DevTools-port discovery, session replacement, domain enable, tab classification.
- `references/helpers.md` — the full imperative helper API over the `cdp()` core, with verified anchors.
- `references/recorder-video.md` — action recording + URL scrubbing + the video composition pipeline.

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
