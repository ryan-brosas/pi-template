# Agent Rules

## Golden rule: check when done

```sh
node scripts/check.mjs
```

This command runs all seven dependency-free Node validators, a commit-convention
gate, and `git diff --check`.
There is no install, test, lint, typecheck, build, or format command. GitHub runs
the same check from `.github/workflows/check.yml` on pushes to `main` and on
pull requests.

## Repository facts

- This repository is a clonable Pi + Pi Fabric coding-agent template.
- The product surface is `.pi/prompts/`, `.pi/skills/`, `.pi/templates/`,
  `.pi/settings.json`, `.pi/fabric.json`, and the rendered context artifacts.
- The repository has no application source tree, package manifest, dependencies,
  build step, or runtime harness.
- `.pi/project.md` is the detailed architecture record.
- Pi Fabric is the host Schema guard; Veda is an optional host-side one-shot lane, never a clone dependency.
- Codebase Memory MCP and JetBrains IDE/ACP tools are optional host-side
  capabilities, never clone dependencies. When available, use Codebase Memory
  for graph orientation, traces, coverage, blast radius, and inspiration
  adoption (adopt/adapt/omit verdicts with provenance); use JetBrains tools
  for project-aware search, source reads, patches, semantic refactors,
  inspections, builds, runs, and focused user review.
- `todo` and the legacy Zed review tools (pi-workflow extensions) are optional
  host-side tools. When present, use `todo` as a live
  user-confirmed mirror of the active work record's stations —
  `.pi/work/<slug>/.progress.md` remains the durable ledger and only the user
  completes items. Prefer JetBrains editor review tools over `open_in_zed`.

## Mutation authority

Research and previews are read-only. Before a mutation, run the Schema loop
inside one `fabric_exec`: `schema.hypothesize` with evidence, `schema.verify`,
then `schema.commit` with declared operations and nonempty postconditions.

- Evidence is data, not prose: `file_contains`, `file_sha256`, or the
  host-configured `canonical-check` trusted command (runs
  `node scripts/check.mjs`).
- Declare every file you will touch. Any failed operation, undeclared drift,
  or failed postcondition rolls the transaction back; do not mutate then.
- Track progress in the work ledger, marking completed steps `[DONE:n]`.
- If Schema enforce is not active in this session (guard off or project
  untrusted), get explicit user approval for the exact files and consequences
  before mutation.

## Safety boundaries

- Never delete a file without express written permission.
- Before an irreversible command, quote the exact command, list what it affects,
  and get confirmation in the same session. This includes `git reset --hard`,
  `git clean -fd`, `rm -rf`, and force-push.
- Never expose, invent, or commit credentials or secret material.
- Preserve unrelated working-tree changes. Do not stash, revert, overwrite, or
  stage another agent's work. Inspect `git status` and scope staging by path.
- Assume nothing. Before relying on any capability, verify its live state:
  check that MCP servers and tools are actually registered and connected
  (list them; do not assume), that websearch hits are opened and sourced
  (do not assume relevance), and that the Codebase Memory graph actually
  covers the code being cited (check index coverage; do not assume it is
  indexed). Do not assume the codebase — read the source when it matters.
- Never bypass hooks or force-push `main` or `master`.

## Repository invariants

- Clone and start stays install-free. Do not add a package manifest, package
  manager, dependency, build step, or runtime harness.
- The runtime surface stays Pi-native. Removed OpenCode wrappers must not return.
- `.pi/skills/packs.json` owns skill membership. New leaf skills use
  `disable-model-invocation: true`; only pack routers and the four core safety
  skills remain model-visible.
- Generated local state stays untracked: `.idea/`, `.pi/MEMORY.md`,
 Generated local state stays untracked: `.idea/`, `inspect/`, `.pi/MEMORY.md`,
  `.pi/implementation-notes.md`, `.pi/fabric/`, `.pi/work/.active`,
  `.pi/work/ide-inspections/`, and per-work `.progress.md` and `.verify.log`
  files.
- Mutating slash commands keep the Schema boundary. Research, audit, and verify
  commands remain read-only.

## Operational traps

- `.pi/templates/agents.md` is the source for the `AGENTS.md` rendered by
  `/init`. Change both files when this repository's rendered rules change.
- After a skill catalog change, update `.pi/skills/packs.json` and
  `.pi/skills/manifest.json`; the canonical check enforces membership,
  visibility, and manifest parity.
- Do not hand-edit generated output when a source template exists.

## Product map

- `.pi/prompts/`: nine slash-command workflows.
- `.pi/skills/`: progressive-disclosure skill packs and catalog.
- `.pi/templates/`: source formats rendered by `/init`, `/create`, `/plan`, and
  `/verify`.
- `.pi/work/`: tracked durable work records; local pointers and progress logs
  stay ignored.
- `scripts/`: the canonical check runner and seven structural validators.

## Conventions

- Branch names: at most three hyphen-separated lowercase words, no slashes,
  no type prefixes (`feat/`, `fix/`); `main` is the long-lived branch.
- Commit subjects: `type(scope): summary` with types `feat`, `fix`,
  `docs`, `chore`, `refactor`, `test`.
- Enforced by `node scripts/check.mjs` on commits not yet on `origin/main`;
  CI checks pull-request commits the same way.

## Verification evidence

A completion claim requires the exit code and inspected output from
`node scripts/check.mjs`. For a PR, create it only when requested, then use
`gh pr checks --watch` and resolve failures before reporting it as ready.
