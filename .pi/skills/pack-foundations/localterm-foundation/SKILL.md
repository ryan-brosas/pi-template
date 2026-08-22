---
name: localterm-foundation
description: "Use when building terminal UIs, terminal rendering, or pi bash-tool security: the streaming secret redactor, spawn-side env scrub, and the localterm terminal stack."
disable-model-invocation: true
---

# Localterm Foundation

## Solves
A full terminal product (web terminal, server, CLI, xterm benchmarks). Crown jewel: a two-layer defense for secrets in the pi bash tool — spawn-side env scrub + output-side streaming redaction.

## When to use
Building terminal UIs, terminal rendering, or pi bash-tool security.

## Key skill-lines
- Keep secrets out of an agent's bash tool -> port `packages/pi-extension/extensions/bash-secret-scrub.ts`: scrubEnv (spawn-side, pure) + createStreamingRedactor (output-side, overlap-tail hold-back, zero-alloc pass-through) + canonical env-var validation patterns.
- Terminal rendering -> study `apps/terminal` + `xterm-bench-*` before building.
- Git command runner -> `packages/server/src/utils/run-git.ts` (fan-in 26).
- Completion engine -> `packages/server/src/completion/`.
- Cross-platform daemon install -> `packages/cli/src/commands/install-launchd.ts` + `install-systemd.ts`.

## Capsule map

### Bash-secret defense
- spawn-side env scrub, streaming output redactor with overlap-lux hold-back, canonical env-var validation — `references/secret-defense.md`.
### Terminal stack & UX
- terminal/PTY/reuse/agent-integration plus completion-theme-fonts, git-diff, and architecture — `references/terminal-pty.md`, `references/architecture.md`, `references/agent-integration.md`, `references/reuse-guide.md`, `references/completion-theme-fonts.md`, `references/git-diff.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in a matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.


## Full view (memory graph)

Indexed in Codebase Memory as **`localterm`** (`/mnt/hdd/utopia/inspo/localterm`, branch `fix/pi-extension-native-import`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "localterm", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "localterm", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "localterm", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "localterm", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/architecture.md` — what it solves, the stack, full module map, data flow.
- `references/secret-defense.md` — the crown jewel: streaming redactor, env scrub, policy chain, edge-case tests.
- `references/terminal-pty.md` — PTY sessions, output framing/flow-control/compression, kitty graphics, shell hooks, all measured thresholds.
- `references/git-diff.md` — the git diff pipeline + reverse-unified-patch.
- `references/completion-theme-fonts.md` — completion engine, iTerm2 theme import, font catalog.
- `references/agent-integration.md` — kitty-images, agent-notify, bash tool reconstruction, settings merge.
- `references/reuse-guide.md` — use cases, reusable primitives, red flags, verification, provenance.

## Skill Result Contract

```xml
<skill_result>
  <skill>localterm-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Primitive ported, provenance cited, tests run</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Overstated barrier, missed env scrub, leaked overlap tail, or none</risks>
</skill_result>
```
