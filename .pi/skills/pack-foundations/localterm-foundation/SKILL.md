---
name: localterm-foundation
description: "Use when building terminal UIs, terminal rendering, or pi bash-tool security: the streaming secret redactor, spawn-side env scrub, and the localterm terminal stack."
disable-model-invocation: true
---
# LocalTerm Foundation

## Use this for
Terminal UIs, terminal rendering, or bash-tool security: a streaming secret redactor, spawn-side environment scrubbing, and a terminal/PTY stack. Source and direct tests are ground truth; references resolve to decisive excerpts and flows.

## Load the matching source dump
- `references/secret-defense.md` — streaming redactor, env scrub, policy chain, edge-case tests, thresholds.
- `references/terminal-pty.md` — PTY sessions, output framing/flow-control/compression, kitty graphics, shell hooks.
- `references/architecture.md` — stack, module map, data flow.
- `references/agent-integration.md` — kitty-images, agent-notify, bash tool reconstruction, settings merge.
- `references/completion-theme-fonts.md` — completion engine, theme import, font catalog.
- `references/git-diff.md` — the git diff pipeline + reverse-unified-patch application.
- `references/reuse-guide.md` — use cases, reusable primitives, red flags, verification, provenance.

## Capsule map
- **Bash-secret defense** — `references/secret-defense.md`: spawn-side env scrub, streaming output redactor with overlap hold-back, canonical env-var validation.
- **Terminal stack & UX** — `references/terminal-pty.md`, `references/architecture.md`, `references/agent-integration.md`, `references/completion-theme-fonts.md`, `references/git-diff.md`, `references/reuse-guide.md`: PTY, kitty protocol, shell hooks, completion/theme/fonts, git-diff patch application.

## Extending the foundation
Add one references-fileshaped capsule per new seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph`/trace retrieval.

## Provenance
Indexed in Codebase Memory as `localterm` (`/mnt/hdd/utopia/inspo/localterm`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt secret redaction, env scrubbing, PTY framing, and the terminal stack; adapt terminal emulator and OS hooks; omit editor/product integration unless a target requires it.
