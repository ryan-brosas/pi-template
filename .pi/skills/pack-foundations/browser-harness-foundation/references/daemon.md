# Browser-Harness — Daemon Reference

Source-grounded reference for `src/browser_harness/daemon.py` (729 lines, read in full) + `run.py`. Graph: hotspot `Daemon.attach_first_page` fan-in 12; `_StreamTail.write` fan-in 10.

## WHAT: a CDP WS holder + line-JSON IPC relay

One daemon per `BU_NAME`: holds the single CDP websocket to the real browser, serves newline-delimited JSON requests over IPC (Unix socket + chmod 600 on POSIX; TCP loopback + **token guard** on Windows — any local process could otherwise issue CDP commands). Helpers are stateless clients: connect → request → close per call (`helpers._send`, 5s timeout).

## WHY discovery is so defensive (the port ladder)

`get_ws_url()` (:218-296) resolves the websocket through ordered fallbacks, each fixing a REAL failure mode:

1. `BU_CDP_WS` / `BU_CDP_URL` env overrides win first. HTTP endpoints resolve via `/json/version`; **403** = Chrome M144+ “Allow remote debugging” popup not accepted; **404** = Chrome 147+ disabled `/json/*` on default profiles — fall back to the ws path recorded in `DevToolsActivePort`.
2. Profile scan: read `DevToolsActivePort` per profile dir (10 macOS / 12 Linux / 10 Windows profiles enumerated), then **verify liveness** — a stale file left by a closed browser must not route recovery to a popup that can't exist (`_devtools_port_live` does a TCP check).
3. Resolve the live URL via `/json/version` on that port rather than trusting the UUID path stored beside it: a previous browser on the same port leaves a stale path whose WS upgrade 404s.
4. Liveness gating: if no Chromium-family browser is even running (SingletonLock pid check; tasklist fallback on Windows), fail fast with an actionable message instead of burning the 30s deadline.
5. Last resort: probe ports 9222/9223 — always `/json/version`, NEVER a bare TCP connect, so a non-Chrome process squatting on the port can't masquerade as Chrome (mirrored in `run.py:_local_chrome_listening`).

`_PatientCDPClient` stretches the WS handshake to 45s so the handshake can stay parked while a human clicks the M144 permission popup.

## WHERE: attach policy (attach_first_page :267-346)

Tab classification decides what's attachable: `is_real_page` (not `chrome://`/internal), `is_reusable_blank_page` (skips “Starting agent …” placeholders), `is_reusable_new_tab_page`, `is_inspect_tab`. Fallback order: real pages → blank → NTP → take over a leftover chrome://inspect recovery tab (navigate it to about:blank) → create about:blank.

**Named daemons get a DEDICATED tab** (`NAME != "default"`): parallel daemons sharing one browser would fight over a single tab — navigations clobber each other. Cloud browsers are exclusive, so they keep first-page attach. A narrow lock re-checks under concurrency so two simultaneous stale-session recoveries share one replacement tab.

## Correctness details worth porting verbatim

- **Session replacement chains** (:452-464): stale→replacement mappings are transitively rewritten (capped at 32) so a request delayed across multiple recoveries lands on its ORIGINAL tab — never whichever tab is current now.
- **Retry only on known replacements** (:648-682): when an explicit-session call hits “Session not found”, retry ONLY on a mapped replacement of that exact session. `self.session` may have changed because the user switched tabs mid-flight — silent redirection would act on the wrong page.
- **Domain enables in parallel**: Page/DOM/Runtime/Network enabled via `gather` with 4s individual timeouts — sequential enables stack toward ~22s worst case, blowing the helper's 5s IPC budget. On tab switch the OLD session gets `Network.disable` (defense in depth against background-tab event pollution) concurrently with the new enables.
- **Server-side current_tab** (:569-579): helpers can't send `Target.getTargetInfo` usefully — the daemon strips `session_id` for `Target.*` (browser-level calls), else Chrome returns the BROWSER target. So the daemon resolves it server-side.
- **Identity pings**: `meta:"ping"` returns `{pong, pid, browser_kind}`; `restart_daemon` verifies the pid before signaling — protects against SIGTERM-by-stale-pid-file after PID reuse. `already_running()` pings too: a bare connect would mistake an unrelated listener that reused our port after a crash for our daemon.
- **🐴 marker hygiene**: title-prefix marker moves on switch (surrogate pair = slice(3)), applied fire-and-forget OFF the synchronous IPC budget; load events re-mark after navigations.
- **Cloud billing guard** (`run.py`): cloud auto-bootstrap requires explicit `BU_AUTOSPAWN`; `BU_CDP_URL/WS` blocks it — otherwise a user's API key set for unrelated reasons silently spawns a billed cloud browser.
