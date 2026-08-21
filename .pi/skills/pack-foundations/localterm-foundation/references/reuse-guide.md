# Localterm — Reuse Guide

(Source-grounded reference; read in full during the pack's gold-standard calibration pass.)

Everything you can do with localterm and every reusable primitive, with exact paths.

## What we can do with it (10 use cases)

1. **Agent-host secret hygiene** — the bash-secret-scrub pattern is directly portable to any pi extension or agent harness that injects secrets into its own env.
2. **A local browser terminal hub** — the whole product: daemon + WebSocket + xterm.js + pi extension.
3. **A terminal that renders kitty images** — `kitty-apc-scanner.ts` + the kitty-images extension + xterm-bench.
4. **Desktop notifications from agents** — `agent-notify.ts` (OSC 9, min-elapsed gating, excerpt extraction).
5. **Git diff surfaced in a terminal UI** — the git-diff pipeline (service/parser/cache/watcher) + diff-viewer annotation UI.
6. **Shell completion in the terminal** — the completion engine (walker/resolver/spec).
7. **Theme/font management** — iTerm2 theme import (`theme-parser.ts`) + the font catalog (`terminal-fonts.ts`).
8. **Age-encrypted secret export** — `secret-export.ts` (interoperable with the stock `age -d -p` CLI).
9. **Cross-platform daemon install** — launchd + systemd + service-setup commands.
10. **Terminal performance benchmarking** — the xterm-bench suite (webgl, race-loop, daemon, aggregator).

## What we can reuse (every reusable primitive)

### Security / secret handling
- `createStreamingRedactor(values)` + `redactText` + `overlapTailLen` (`packages/pi-extension/src/utils/redact-output.ts`) — streaming secret redaction with overlap-tail hold-back and zero-alloc pass-through.
- `scrubEnv(env, strip)` (`src/utils/scrub-env.ts`) — pure spawn-side env scrub.
- `readLocaltermSecretEnvVarsForPi` / `readLocaltermSecretValuesForPi` — the policy chain (names-only files + process.env values).
- The canonical validation patterns (`ENV_VAR_PATTERN` etc.) — hostile-input hardening.
- `readPiShellSettings(cwd)` — merge global+project shell settings.
- `encryptSecretExport` / `decryptSecretExport` (`packages/server/src/secret-export.ts`) — age-encrypted, zod-validated, age-CLI-interoperable secret export.
- `isLoopbackHost` / `isPrivateHost` (`packages/server/src/security.ts`) — loopback/private-IP detection with bare-IPv6 normalization, private IPv4/IPv6 ranges, `.localhost` suffix.

### Terminal / PTY
- `session.ts` — PTY session lifecycle (node-pty spawn, env build, shell hooks, scrollback replay).
- `session-output-transport.ts` + `session-output-coordinator.ts` — the output framing/compression transport.
- `kitty-apc-scanner.ts` — parse kitty graphics APC frames, detect screen resets (straddle-safe), remove medium probes.
- `buildPtyEnvironment` + `PTY_ENV_DENYLIST` — strip terminal-identity env vars so Ink TUIs render as generic xterm-256color.
- `shell-hook-builder.ts` — zsh/bash/fish OSC7 + git-dirty + automation hooks (per-shell, with exec-shadow and re-entry guards).

### Git / diff
- `git-diff-service.ts` — the diff service: working/committed modes, untracked patches, PR dedup, caching.
- `git-diff-parser.ts` — `countLines`, `buildUntrackedPatch` (the `@@ -0,0 +1,N @@` shape), `splitPatchByFile`, `parseNumstatZ` (NUL-separated, rename-aware), `parseNameStatusZ`, `indexPatchesByPath`.
- `git-diff-cache.ts` / `git-diff-watcher.ts` / `git-branch-metadata.ts` / `git-worktrees.ts`.
- `reverseUnifiedPatch(patchedSource, patchSource, filePath)` (`apps/harness/light-theme-rendering/reverse-unified-patch.mjs`) — reverse a unified diff hunk by hunk, with patch-mismatch errors.

### Completion
- `completion/{index,walker,resolver,spec}.ts` — `resolveCompletionContext`, `resolveCandidates`, `formatCandidates`, `CommandSpec`/`OptionSpec`/`PositionalSpec`.

### UI / theme / fonts
- `theme-parser.ts` — iTerm2 theme import (color-key mapping, hex normalization, theme id generation).
- `terminal-fonts.ts` — the font catalog (fontsource + custom), shared server/browser.
- `apps/terminal/src/components/` — the React terminal UI (agent-composer, command-palette, diff-viewer-annotation, automations).

### Agent integration
- `kitty-images.ts` — `enableKittyImages()`: set pi-tui capabilities BEFORE TUI.start() checks image support.
- `agent-notify.ts` — OSC 9 notifications with min-elapsed gating (30s), excerpt extraction, retry-event tracking.
- `osc-sequence.ts` — `buildOsc9Sequence` (capped at NOTIFICATION_MAX_LENGTH=1024, surrogate-safe).

### Measured thresholds (the battle-tests) — `packages/server/src/constants.ts`
- `MAX_INPUT_BYTES = 64K`, `MAX_OUTPUT_BYTES = 1MB`, `MAX_IMAGE_UPLOAD_BYTES = 32MB` (+64K multipart overhead).
- `WS_OUTBOUND_PAUSE_HIGH_WATER_BYTES = 4MB` / `RESUME_LOW = 1MB` / `DRAIN_POLL_MS = 50` — PTY->WS flow control via water marks, not socket kill.
- `WS_BACKPRESSURE_THRESHOLD_BYTES = 64MB` — runaway connection drop.
- `OUTPUT_BATCH_FLUSH_BYTES = 64K` + `OUTPUT_BATCH_WINDOW_MS = 2` + `OUTPUT_STREAM_THRESHOLD_MS = 100` — the atomic-frame vs progressive-stream split (measured: 180x55 tmux redraws are 182-233 KiB; 64K chunks parse in 4-6ms, under xterm's 12ms write budget; ~235 msg/s vs 470 at 32K).
- `OUTPUT_SYNCHRONIZED_FRAME_TIMEOUT_MS = 1000` — DEC 2026 safety timeout.
- Output compression: `WS_OUTPUT_RAW=0x00 / GZIP=0x01 / BROTLI=0x02 / BROTLI_CTX=0x03` (5-byte header: 0x03 + 4-byte LE raw size). Brotli q6 ~10x per 64K chunk; context-takeover delta adds 1.24-3.7x (3.7x for a 1-row TUI update, 1.24x for SIGWINCH re-wrap).
- `KITTY_KEYBOARD_STACK_MAX_DEPTH = 16`, `MAX_CONCURRENT_SESSIONS = 64`, `MAX_COLS/MAX_ROWS = 1000`.
- `HOOKED_SHELL_NAMES = {zsh, bash, fish}` — prompt hooks eval via the hook, other shells get at-spawn PTY writes.
- `PTY_ENV_DENYLIST` — the full terminal-identity denylist (TERM_PROGRAM, KITTY_*, WT_*, GHOSTTY_*, VSCODE_*, ...).

## Red flags (consolidated)

- Treating the two secret layers as a hard barrier (parent-process introspection still reaches keys).
- A streaming redactor that emits the overlap tail (leaks the value's leading chars).
- Masking with a length-preserving char (leaks the value's length).
- Redacting values below the length floor (clobbers ordinary output).
- Reading secret VALUES from a policy file on disk instead of process.env.
- Letting a spawned command inherit pi's secret env vars.
- Splicing OSC sequences into the PTY output stream (corrupts in-flight escape sequences from modern TUIs using DECSET 2026).
- Enabling kitty images after TUI.start() (the first CSI 16 query is skipped, sizing falls back).
- A PTY->WS pipe with no water marks (memory balloons or the socket dies).
- Not scrubbing URLs before recording browser actions.
- Reversing a patch without verifying context lines match.
- Building an untracked patch without the `\ No newline` marker.

## Verification (consolidated)

- A value split across two onData chunks is redacted whole (overlap tail holds it).
- A multibyte char split across chunks survives (TextDecoder).
- No secrets appear in captured stdout/stderr of the bash tool.
- scrubEnv never mutates the input env.
- Policy files contain names only, never values.
- The zero-alloc pass-through fires when no secrets are wired.
- reverseUnifiedPatch restores a file exactly and throws on mismatch.
- buildUntrackedPatch produces a valid `@@ -0,0 +1,N @@` hunk.
- Output transport: a >64K redraw arrives as atomic frames; a continuous stream switches to progressive 64K delivery.
- Kitty images render without a skipped CSI 16 query.

## Provenance

- Owner: Aiden Bai. License: MIT (2026). Branch: `fix/pi-extension-native-import`. Graph: 7057 nodes / 21911 edges. Boundaries: terminal->server (37), cli->server (29), server->pi-extension (20). Hotspots: cn (108), runGit (26), bash-secret-scrub emit (23), onClose (19), identity/resolve (18).
