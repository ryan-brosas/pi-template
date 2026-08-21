# Localterm — Agent Integration Reference

How localterm integrates with the pi agent: the pi-extension (kitty images, agent notifications, bash tool reconstruction, settings).

## The pi extension (`packages/pi-extension/`)

Runs INSIDE pi (the agent host). Registers tools, hooks, and capabilities.

### Kitty images (`extensions/kitty-images.ts`)

`enableKittyImages()`:
- localterm renders xterm.js with the Kitty graphics + OSC 8 hyperlink addons, but sets `TERM=xterm-256color` and strips terminal-identity env vars so Ink TUIs don't probe for a protocol xterm.js lacks. pi-tui therefore reports images/hyperlinks as unsupported.
- The fix: enable them while the extension factory is loading, **BEFORE `TUI.start()` checks image support and sends its CSI 16 t cell-metrics query**. Waiting for session_start is too late — the first query is then skipped and image sizing keeps pi-tui's fallback cell dimensions.
- Uses `getCapabilities()` / `setCapabilities()` from `@earendil-works/pi-tui`.

**The lesson: capability flags must be set before the first capability query, not on session_start.**

### Agent notifications (`extensions/agent-notify.ts`)

OSC 9 desktop notifications when the agent finishes a turn:
- `AGENT_NOTIFY_MIN_ELAPSED_MS = 30_000` — only notify when the turn ran at least 30s (so quick back-and-forth doesn't spam a user watching the pi tab).
- Tracks retry events (`PI_RETRY_STARTED/COMPLETED/CANCELLED`) so a notification only fires once the run has settled.
- `extractAssistantExcerpt(messages)` — a capped excerpt of the assistant's final answer (`AGENT_NOTIFY_EXCERPT_MAX_CHARS = 160`, whitespace-collapsed).
- `formatAgentEndBody(elapsedMs, sessionName, excerpt)` — the body.
- `buildOsc9Sequence` (`src/utils/osc-sequence.ts`) — frames the OSC 9 sequence, capped at `NOTIFICATION_MAX_LENGTH = 1024` UTF-16 code units (never splits a surrogate pair).

**The lesson: gate notifications on elapsed time + settled state; cap and surrogate-safe-frame the OSC body.**

### Bash tool reconstruction (the secret defense — see secret-defense.md)

`registerBashSecretScrub(pi)`:
- Reads `readPiShellSettings(cwd)` (shellPath + commandPrefix) so the reconstructed bash tool preserves the user's configuration.
- Builds the strip set + redaction values, recomputed on `session_start`.
- Registers the BashSpawnHook (scrubEnv) + wraps operations with the streaming redactor.
- `pi.registerTool(createBashToolDefinition(cwd, { operations, spawnHook, commandPrefix, shellPath }))`.

### Other extension utils

- `collapse-whitespace.ts` — whitespace collapse for notification excerpts.
- `retry-event-id.ts` — retry event correlation.
- `activation.ts`, `index.ts` — extension wiring.

## Settings merge (`src/utils/read-pi-shell-settings.ts`)

- Reads the same two files pi's SettingsManager merges: global `~/.pi/agent/settings.json` + project `<cwd>/.pi/settings.json`; project wins.
- `shellPath` (override the shell binary) + `shellCommandPrefix` (prepended to every command, e.g. `shopt -s expand_aliases`).
- A shallow merge suffices because both keys are top-level scalars.
- `paths` overridable for tests so they never touch the real pi settings.

## Red flags

- Setting kitty capabilities after TUI.start() (first query skipped).
- Notifying on every turn (spam) or before the run settles (stale).
- Reconstructing the bash tool without passing shellPath/commandPrefix through.
- An OSC body that splits a surrogate pair or exceeds the daemon's cap.

## Verification

- Kitty images render without a skipped CSI 16 query.
- A notification fires only after a settled run of >= 30s, with a capped excerpt.
- The reconstructed bash tool preserves the user's shell settings.
