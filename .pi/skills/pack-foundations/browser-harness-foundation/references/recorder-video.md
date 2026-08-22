# Browser-Harness — Recorder & Video Composition Reference

(Source-grounded; read in full: `src/browser_harness/recorder.py` (324 lines), `src/browser_harness/video.py` validation core (1-420).)

Source-grounded reference for `recorder.py` (324 lines, full) and `video.py` validation core (:1-420).

## Recorder: a folder, a marker, and a whitelist

A recording is just `<workspace>/recordings/<name>/`: `meta.json`, `events.jsonl` (one JSON object per action), `NNNN.jpg` frames. State survives across CLI invocations via a MARKER FILE (`.active-<name>`) — the daemon is untouched.

- **Transparent capture**: `run.py:_traced` wraps every public helper; successful calls invoke `recorder.observe(name,args,kwargs,duration)` which NEVER raises (recording failures must never break the run).
- **Frame whitelist** (`ACTIONS`): only screen-changing helpers get frames — read-only helpers (js, page_info, screenshots) would bloat inspection-heavy sessions without adding visual beats. Waits ARE whitelisted (they mark time passing).
- **Paint settle**: 0.15s sleep before the post-action frame so the page has painted.
- **Per-event context** (`_CTX_JS`): url/title/viewport/scroll/dpr + focused-element bounding box (lets video zoom on the input being typed) + focused element's input type (drives password masking). Password fields mask text to •••• at CAPTURE time (`_mask`).
- **URL scrubbing at write time** (`_scrub_url` :52-53): regex strips OAuth codes/tokens/api keys/session state from query AND fragment params — auth redirects otherwise land real secrets in folders people share. Applied to every url/to field in events.jsonl.
- **Auto-recording**: opt-in preference (config file written atomically tmp+rename, chmod 600; `BH_RECORD` env overrides per-process). Auto recordings ROLL OVER after 180s idle (`BH_RECORD_IDLE`) — a pause ends one task so sessions don't merge or grow forever; explicit start_recording() never auto-rolls. Auto-start is SILENT (no stdout — agents parse it); same-second name collisions resolved by suffixing.
- Frames created with exclusive `xb` opens + retry — safe under concurrency.

## Video composition: validate hard, then pace

The pipeline: recording + authoring brief → compile → review HTML → verified MP4 export. Source integrity via sha256 manifest (`write_source_manifest`/`verify_source_manifest`) — ANY source change after init is rejected.

Strict validation (`BriefError` on everything):
- `reject_unknown` — unknown keys are errors, never ignored (the contract stays deliberately small).
- `validate_narration` ≤ 7 words; routes must be SEMANTIC (`ROUTE_UNSAFE` rejects raw URLs/@/UUIDs — identity must not leak into video text); SENSITIVE regex flags emails/tenant ids elsewhere.
- `event_at` — one-based ints into recording-summary.json, must have captured frames.
- `require_matching_viewport` — beat frames within ±2px of the composition viewport, else "split or normalize the recording first".
- Typing beats need captured boxes; `showTyping` REFUSES password fields and requires the original typed event source.
- Narration CADENCE rules: narration is sticky — max ceil(n/2) cues per n-beat segment, never 3 consecutive narrated actions ("text and screenshots use different pacing").

Pacing is computed, not guessed: word-count-driven card durations (reading WPM), click/after/typing minimums, a bounded total budget (22s base → 32s cap), raw-to-card hold extensions.

**The lesson: generated media needs generation-time redaction (scrub URLs/mask passwords at capture), hash-pinned sources, reject-don't-ignore validation, and computed pacing — drift between narrative and frames is THE failure mode.**
