# Browser-Harness — Human-Facing Auth UX (5W1H)

(Source-grounded; read: `src/browser_harness/auth.py` (543 lines; structure + flow ranges), companion `src/browser_harness/video.py`.)

Source-grounded reference for `auth.py` (543 lines; structure + flow ranges read). Companion to `recorder-video.md` (the video pipeline is the other human-facing surface).

## WHO
Two audiences AT ONCE: the calling AGENT (which hits cloud-auth walls mid-task) and the HUMAN who must authenticate.

## WHAT
Three login paths behind one command (`browser-harness auth login`): browser OAuth with local callback, device-code (SSH/headless), and manual API-key entry.

## WHEN
The model-facing contract is deliberately TINY (:9-11): cloud startup either has a key or raises `CloudAuthRequired` whose message IS the instruction — "cloud-auth-required: run `browser-harness auth login`" (:37-40). Errors are next actions, not diagnostics.

## WHERE
`start_browser_auth` :206-247, `complete_browser_auth` :249-268, `browser_login` output split :270-293, `_read_manual_api_key` :448-462, `_write_private_json` :465-477.

## WHY
- *Dual-audience output*: every flow has a `json_output` branch emitting machine-parseable state (`{"status": "needs_user_auth", "auth_url", ...}`) while humans get PROSE that adapts to reality — "Waiting for login to complete…" vs "…after you open the URL" depending on whether `webbrowser.open()` actually succeeded (:286-289). An agent pipes JSON; a human never sees a lie.
- *Three paths because three environments*: desktop → OAuth + localhost callback server (PKCE S256, `state=token_urlsafe(32)`, device name from env); SSH/headless → device-code with `verification_uri_complete` preferred so the user skips typing the code; no browser at all → getpass API key.
- *TTY-adaptive secret entry* (:448-456): tty → `getpass` (no echo); pipe → read stream; both validate a length heuristic (≥20 chars = "looks too short") BEFORE storing anything.
- *Secrets at rest are 0600 by construction* (:465-477): `os.open` with `S_IRUSR|S_IWUSR` at CREATION time — never create-then-chmod (a window where the file is world-readable).
- *Callback lifecycle is exception-safe*: the HTTP server closes in `except BaseException` around the START request AND in `finally` around completion; `handle_request()` runs in a 0.5s-timeout poll loop so Ctrl-C stays responsive during the 600s wait.
- *Auth failures carry the provider's words*: callback errors re-raise `error` + `error_description` verbatim (:260-262) — the user sees WHY the provider refused, not a generic failure.

## HOW
PKCE pair generated locally; redirect URI derived from the ACTUAL bound address of the ephemeral callback server; token exchange posts code+verifier; `AuthRecord.from_token_response` normalizes scopes/expiry; success output confirms storage without echoing the key.

## Verification

The package respects the same contract as the auth module's test surface (`src/browser_harness/auth.py`, plus `src/browser_harness/telemetry.py` (308 lines) which counts auth events). The companion `src/browser_harness/recorder.py` auto-recording semantics mirror the opt-in pattern here.
