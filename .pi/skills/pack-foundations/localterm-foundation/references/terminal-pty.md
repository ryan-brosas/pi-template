# Localterm — Terminal & PTY Reference

(Source-grounded reference; read in full during the pack's gold-standard calibration pass. Files: `packages/server/src/pts/*`, `packages/server/src/utils/terminal-*.ts`.)

The terminal stack: PTY sessions, output transport/framing/compression, kitty graphics parsing, PTY environment, shell hooks, and all measured thresholds.

## PTY session lifecycle (`packages/server/src/session.ts`)

- Uses `node-pty` (`spawn`, `IPty`).
- Builds the PTY environment via `buildPtyEnvironment` + applies `PTY_ENV_DENYLIST`.
- **Titles are emitted on a dedicated `title` event, NEVER spliced into the PTY output stream** — splicing corrupts in-flight escape sequences from modern TUIs (Cursor Agent / Claude Code use DECSET 2026 synchronized output mode; any byte inside that frame breaks parser state).
- `ensureSpawnHelperExecutable` + `getDe...` (spawn helper).
- Constants: `DEFAULT_COLS`, `DEFAULT_ROWS`, `TERM_TYPE`, `SESSION_SCROLLBACK_REPLAY_BYTES`, `MAX_PENDING_PARSE_BYTES`, `ALT_SCREEN_FOREGROUND`, `HOOKED_SHELL_NAMES`, `MAX_NOTIFICATION_LENGTH`.

## PTY output framing, compression, kitty graphics (paths: `packages/server/src/protocol/framing.ts`, `packages/server/src/utils/compress-frame.ts`, `packages/server/src/utils/kitty-parse.ts` for graphics advances/chunking)

## PTY environment denylist (`packages/server/src/constants.ts`)

Strip terminal-emulator identity env vars inherited from the daemon's parent. If you leak e.g. `TERM_PROGRAM=ghostty`, modern Ink-based TUIs probe for that terminal's protocol (kitty keyboard, XTQVERSION, XTGETTCAP, OSC 1337) and — when xterm.js doesn't answer — fall back to degraded inline-plain rendering. Removing these makes the TUI treat us as a generic xterm-256color.

```
PTY_ENV_DENYLIST = [LOCALTERM_DAEMON_CHILD, LOCALTERM_INITIAL_COMMAND, LOCALTERM_SESSION_ID,
  __LOCALTERM_EXEC_DEPTH, TERM_PROGRAM, TERM_PROGRAM_VERSION, TERM_SESSION_ID, ITERM_SESSION_ID,
  ITERM_PROFILE, KITTY_WINDOW_ID, KITTY_PID, WT_SESSION, WT_PROFILE_ID, GHOSTTY_RESOURCES_DIR,
  GHOSTTY_BIN_DIR, VSCODE_INJECTION, VSCODE_GIT_IPC_HANDLE, ZDOTDIR]
```

## Output transport: framing + flow control + compression

### Backpressure water marks (PTY -> WS)
- `WS_OUTBOUND_PAUSE_HIGH_WATER_BYTES = 4MB` / `WS_OUTBOUND_RESUME_LOW_WATER_BYTES = 1MB` / `WS_OUTBOUND_DRAIN_POLL_MS = 50` — crossing high water pauses the PTY so the OS pipe absorbs further output until the WS drains below low water; then resume. **Water marks, not socket kill.**
- `RENDERER_PENDING_*` mirror the same for headless xterm parsing.
- `WS_PENDING_CLIENT_MAX_BYTES` + `WS_PENDING_CLIENT_MAX_CONTROL_MESSAGES = 256`.
- `WS_BACKPRESSURE_THRESHOLD_BYTES = 64MB` — past this, the receiver is genuinely stuck; drop the connection rather than balloon memory.

### Output framing (the atomic-frame vs progressive-stream split)
- `OUTPUT_BATCH_FLUSH_BYTES = 64K` — keep each transport chunk at 64K for high-throughput output. The dominant cost is per-message RunTask plumbing on the renderer main thread (median 0.30ms body, ~88% fixed V8/Chrome task-lifecycle overhead). At 64K: ~235 msg/s vs ~470 at the old 32K cap; a chunk still parses in 4-6ms, below xterm's 12ms write budget.
- `OUTPUT_BATCH_WINDOW_MS = 2` — reset this idle timer on every PTY data event so a sub-64K burst flushes after its last chunk, not midway through an erase-and-repaint.
- `OUTPUT_STREAM_THRESHOLD_MS = 100` — a size-capped burst stays one atomic frame while it resembles a TUI redraw; continuous output past this switches to progressive 64K delivery so streams never wait indefinitely.
- `OUTPUT_SYNCHRONIZED_FRAME_TIMEOUT_MS = 1000` — DEC 2026 is authoritative unless an app leaves it open; match xterm's safety timeout, then release staged bytes as a stream.
- A size-split redraw is bracketed with output-frame-start/end so the browser stages all chunks and passes the complete logical frame to xterm at once. Measured: 180x55 tmux and Herdr redraws are 182-233 KiB, far beyond one transport chunk.

### Output compression (per-frame, backward-compatible)
Header byte + payload:
- `0x00` = raw (1-byte header; below threshold OR a raw-mode viewer).
- `0x01` = gzip per-frame (widest fallback: Chrome 80+).
- `0x02` = brotli per-frame (Chrome 105+ / Safari 16.4+).
- `0x03` = brotli context-takeover (5-byte header: 0x03 + 4-byte LE raw size; the persistent stream compresses each frame against the prior screen — the delta).

Measured: Brotli q6 on each 64K chunk ~10x; context-takeover delta adds 1.24-3.7x (3.7x for a 1-row TUI update, 1.24x for a SIGWINCH re-wrap) — the prior screen primes the LZ77 window so unchanged rows compress to back-references. Frames below the threshold skip compression (the deflate header costs more than it saves).

## Kitty graphics parsing (`packages/server/src/kitty-apc-scanner.ts`)

Parses kitty graphics APC frames from PTY output:
- APC = `ESC _` ... `ESC \`; the final byte after `ESC _` identifying kitty graphics is `0x47` ('G').
- `KittyPixelFrame { width, height, imageId, path }` — extracted frames.
- `KittyMediumProbe { imageId, quiet, path }` — medium probes REMOVED from client output (answered by the daemon; leaking them would race the terminal emulator's own reply). Everything else, including file-medium transmits, passes through verbatim.
- `screenReset` — true when the app left the alternate screen (`ESC[?1049l`, `ESC[?1047l`, `ESC[?47l`) or hard-reset (`ESC c`); any relayed pixel picture is stale, so the client must clear its overlay.
- Reset sequences can straddle two PTY data events — carry `SCREEN_RESET_TAIL_BYTES = 7` of the previous chunk's tail.
- `MAX_APC_BUFFER_BYTES` caps the parse buffer.

## Shell hooks (`packages/server/src/shell-hook-builder.ts`)

- `HOOKED_SHELL_NAMES = {zsh, bash, fish}` — localterm installs prompt hooks (osc7, git-dirty, automation-exit) into these. An initial command for a hooked shell runs via the hook (eval) instead of a PTY write, so it never goes through the line editor's typed-input path and can't race ECHO or double-echo. Other shells (sh, dash, arbitrary) get the at-spawn PTY write.
- **zsh hook** (the deepest): stable per-user dir `~/.localterm/zsh-hook` (deliberately NOT in hookCleanupPaths — exec'd wrapper shells re-source it via inherited ZDOTDIR). Generates a hook script that:
  - Re-entry guard: `[[ -n "${__LOCALTERM_HOOK_SOURCED:-}" ]] && return 0` (shell-local, not exported).
  - Sources the user's `.zshenv`, `.zprofile`, `.zshrc` in login order, shadowing `ZDOTDIR` around them.
  - `unfunction exec 2>/dev/null || true` then prepends the secrets shims dir AFTER rc runs (so shims reliably shadow real binaries despite rc PATH manipulation).
  - Disables `PROMPT_SP` (the EOL mark + fill-space burst) — the stray `%` / blank-line bug at spawn when the PTY starts wide while mobile xterm is narrow.
- `shimPathPrependLine` from `secret-shims.ts`.

## Other server modules

- `security.ts` — `isLoopbackHost` / `isPrivateHost` (see security reference): host-header parsing, bare-IPv6 normalization, private IPv4/IPv6 ranges, `.localhost` suffix.
- `secret-export.ts` — age-encrypted, zod-validated, age-CLI-interoperable secret export/import.
- `caffeinate-*` — keep-awake (battery, detector, process-match, preferences-store).
- `update-check-store`, `heartbeat-store`, `automation-store`, `worktree-config-store` — daemon stores.
- `listening-ports`, `pi-binary-resolver`, `agent-models`, `agent-log-utils`, `agent-git-status`.
- `cdp/constants.ts` — the terminal browser CDP.

## All measured thresholds (constants.ts)

- Input/output: `MAX_INPUT_BYTES = 64K`, `MAX_OUTPUT_BYTES = 1MB`.
- Image upload: `MAX_IMAGE_UPLOAD_BYTES = 32MB` (+ `MAX_IMAGE_UPLOAD_MULTIPART_OVERHEAD_BYTES = 64K`).
- Foreground/title/notification: `MAX_FOREGROUND_LENGTH = 256`, `MAX_TITLE_LENGTH = 4K`, `MAX_NOTIFICATION_LENGTH = 1024`.
- `MAX_PENDING_PARSE_BYTES = 4096`, `KITTY_KEYBOARD_STACK_MAX_DEPTH = 16`, kitty keyboard set modes (REPLACE=1/OR=2/AND_NOT=3).
- `TERMINAL_ALTERNATE_SCREEN_PRIVATE_MODE_CODES = [47, 1047, 1049]`.
- `MAX_COLS/MAX_ROWS = 1000`, `MAX_CONCURRENT_SESSIONS = 64`.
- `TITLE_MAX_PATH_SEGMENTS = 1`.
- `SECURITY_BINARY_PATH = "/usr/bin/security"` (absolute, so the shim never depends on PATH).

## Red flags

- Splicing OSC/title sequences into the PTY output stream (corrupts DEC 2026 frames).
- A PTY->WS pipe with no water marks (memory balloons or the socket dies).
- Not stripping terminal-identity env vars (Ink TUIs degrade to inline-plain).
- Enabling kitty images after TUI.start() (the first CSI 16 query is skipped).
- A continuous stream waiting forever for an idle boundary (needs the duration threshold).
- Not carrying the previous chunk tail across a kitty reset sequence straddle.

## Verification

- A >64K redraw arrives as atomic frames; a continuous stream switches to progressive 64K delivery.
- Brotli context-takeover compresses a 1-row TUI update ~3.7x.
- Water marks pause/resume the PTY without killing the socket.
- Kitty frames are extracted; medium probes removed; screen resets clear the overlay.
- A zsh hook sources the user's rc in login order without recursive re-entry.
