---
name: browser-harness-foundation
description: "Use when building browser automation tooling: a CDP daemon that attaches to a real browser, high-level page helpers, action recording, and video composition from recordings."
disable-model-invocation: true
---
# Browser Harness Foundation

## Use this for
Browser automation tooling that must attach to a real (already-open) browser over the DevTools protocol, offer high-level imperative page helpers, record user actions, and compose videos from those recordings. Source and tests are ground truth; references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/daemon.md` — DevTools-port discovery, session replacement, CDP domain enable, tab classification.
- `references/helpers.md` — the full imperative helper API over the `cdp()` core, with verified anchors.
- `references/recorder-video.md` — action recording + URL scrubbing + the video composition pipeline.
- `references/ux.md` — human-facing auth flows: PKCE/device-code/manual-key triage, agent-vs-human output modes.

## Capsule map
- **CDP daemon** — `references/daemon.md`: auto-start, classified-tab attach, parallel CDP domain enable, session-replacement chains.
- **Recording & helpers** — `references/helpers.md`, `references/recorder-video.md`, `references/ux.md`: pre-imported imperative helpers with explicit waits, action recorder with URL scrubbing and video composition.

## Extending the foundation
Add one references-fileshaped capsule per portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph`/trace retrieval.

## Provenance
Indexed in Codebase Memory as `browser-harness` (`/mnt/hdd/utopia/inspo/browser-harness`); source and its direct tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the daemon lifecycle, helper API, recorder, and composition contracts; adapt CDP transport and video encoders; omit auth-flow and output-mode presentation unless a target requires it.
