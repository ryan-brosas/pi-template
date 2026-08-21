# Localterm — Architecture Reference

(Source-grounded reference; read in full during the pack's gold-standard calibration pass. Full module map in `packages/server/src/**` and `apps/terminal/src/**`.)

Complete technical map for **localterm** (Aiden Bai). MIT License. Branch `fix/pi-extension-native-import`, commit b709edb-era (2026). Root: `/mnt/hdd/utopia/inspo/localterm`. Graph: 7057 nodes / 21911 edges.

## What it solves

A **local browser-based terminal hub**: a daemon runs on your machine, a web terminal app connects over WebSocket, and a pi extension makes the terminal the agent's home. It is the accumulated result of the master's terminal battles — terminal video, kitty images, terminal browser — and encodes dozens of hard-won measurements (backpressure, output framing, PTY flow control, secret handling).

## The stack

| Layer | Technology | Where |
|---|---|---|
| PTY | `node-pty` (IPty, spawn) | `packages/server/src/session.ts` |
| Web terminal | xterm.js + kitty-graphics + OSC-8-hyperlink addons | `apps/terminal` |
| HTTP | `hono` (Context, MiddlewareHandler) | `packages/server/src/security.ts` |
| CLI | `commander` (Command, Option) | `packages/cli/src/program.ts` |
| Secret export | `age-encryption` (Encrypter/Decrypter, armor) | `packages/server/src/secret-export.ts` |
| Validation | zod (schemas) | `packages/server/src/schemas.ts` |
| Pi extension | `@earendil-works/pi-coding-agent` (ExtensionAPI) | `packages/pi-extension/` |
| TUI capability | `@earendil-works/pi-tui` (getCapabilities/setCapabilities) | `packages/pi-extension/extensions/kitty-images.ts` |
| Tests | `vite-plus/test` | `packages/pi-extension/tests/` |
| macOS keychain | `/usr/bin/security` (absolute path) | `packages/server/src/constants.ts` |

## Full module map

```
packages/pi-extension/   -> runs INSIDE pi (the agent host)
  extensions/bash-secret-scrub.ts  -> the crown jewel: two-layer secret defense
  extensions/kitty-images.ts       -> enable kitty graphics + hyperlinks in pi-tui
  extensions/agent-notify.ts       -> OSC 9 desktop notifications on agent end
  extensions/activation.ts, index.ts
  src/utils/redact-output.ts       -> redactText, overlapTailLen, createStreamingRedactor
  src/utils/scrub-env.ts           -> scrubEnv (pure env scrub)
  src/utils/read-secret-values.ts  -> readLocaltermSecretValuesForPi
  src/utils/read-localterm-secret-policy.ts -> readLocaltermSecretEnvVarsForPi
  src/utils/read-pi-shell-settings.ts       -> readPiShellSettings (shellPath + commandPrefix)
  src/utils/osc-sequence.ts        -> buildOsc9Sequence
  src/utils/agent-notify-body.ts   -> extractAssistantExcerpt, formatAgentEndBody
  src/utils/retry-event-id.ts, collapse-whitespace.ts
  src/constants.ts                 -> patterns, masks, thresholds
  tests/                           -> redact-output, scrub-env, secret-policy, kitty-images, osc-sequence, ...

packages/server/         -> the daemon
  src/session.ts                  -> PTY session lifecycle (node-pty)
  src/session-output-transport.ts -> the output framing/compression transport
  src/session-output-coordinator.ts, session-command-executor.ts
  src/security.ts                 -> isLoopbackHost / isPrivateHost (hono middleware)
  src/constants.ts                -> ALL the measured thresholds
  src/secret-export.ts            -> age-encrypted secret export/import
  src/secret-shims.ts             -> shimPathPrependLine
  src/shell-hook-builder.ts       -> zsh/bash/fish OSC7 + git-dirty + automation hooks
  src/git-diff-{service,parser,cache,watcher}.ts -> the git diff pipeline
  src/git-branch-metadata.ts, git-diff-coordinator.ts, git-worktrees.ts, git-metadata-coordinator.ts
  src/completion/{index,walker,resolver,spec}.ts -> shell completion engine
  src/theme-parser.ts             -> import iTerm2 themes -> TerminalTheme
  src/terminal-themes.ts, terminal-fonts.ts
  src/kitty-apc-scanner.ts        -> parse kitty graphics APC frames from PTY output
  src/cdp/constants.ts            -> the terminal browser CDP
  src/caffeinate-{battery,detector,process-match,preferences-store}.ts
  src/update-check-store.ts, heartbeat-store.ts, automation-store.ts, worktree-config-store.ts
  src/listening-ports.ts, pi-binary-resolver.ts, agent-models.ts, agent-log-utils.ts, agent-git-status.ts
  src/errors.ts, protocol.ts, schemas.ts, types.ts

packages/cli/            -> the CLI
  src/program.ts                 -> commander program: start/stop/status/install/...
  src/commands/{start,stop,status,install,install-launchd,install-systemd,install-service-setup,
                session,session-api,session-mouse,secret,secret-get,secret-get-fast-path,
                config,theme,font,update,process,completions,resolve-session-id,restart}.ts
  src/state.ts, paths.ts, constants.ts

apps/terminal/           -> the web terminal app (React)
  src/app.tsx                    -> AuthGate -> Terminal
  src/components/{terminal,agent-composer,command-palette,diff-viewer-annotation-ui,
                ambient-action-search-toolbar,auth-gate,automation-*,connection-status-dialog,...}.tsx

apps/harness/            -> light-theme-rendering
  reverse-unified-patch.mjs      -> reverseUnifiedPatch (entry point)

xterm-bench-*            -> the benchmark battles
  xterm-bench-webgl, xterm-race-loop, xterm-bench-daemon, aggregator
```

## Graph signals

- Nodes 7057 / edges 21911.
- Boundaries: terminal->server (37), cli->server (29), server->pi-extension (20), cli->terminal (3).
- Hotspots: cn (108, classnames), runGit (26), bash-secret-scrub emit (23), onClose (19), identity/resolve (18), fetchSessionApi (18).

## Data-flow overview

1. **CLI start** -> spawns the daemon (foreground or daemonized) -> daemon binds a port (default via PORT env or DEFAULT_PORT).
2. **Web terminal** connects over WebSocket -> daemon attaches it to a PTY session (node-pty spawn with buildPtyEnvironment + PTY_ENV_DENYLIST).
3. **PTY output** flows through session-output-transport: batched into atomic frames (64K) or progressive streams, compressed (raw/gzip/brotli/brotli-ctx), sent over WS.
4. **Kitty graphics** in PTY output are parsed by kitty-apc-scanner (frames extracted, medium probes removed, screen resets detected).
5. **pi extension** (inside the agent) registers the bash tool with a spawnHook + redaction wrapper. Secrets are scrubbed from child env and redacted from output.
6. **Git diff** is surfaced via the git-diff pipeline (service/parser/cache/watcher) into the terminal's diff-viewer annotation UI.
