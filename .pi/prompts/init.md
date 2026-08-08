---
description: Initialize this pi project with repository-aware AGENTS.md and durable .pi/project context; use --deep for evidence-backed architecture analysis
argument-hint: "[--deep]"
---

# Project initialization: ${ARGUMENTS:-default}

Initialize the current project for reliable pi + Ultra Fabric work. This is an
operational workflow: inspect the repository, preview proposed context, obtain
prewalk acceptance, write idempotently, verify every artifact, and report the
next action.

Supported invocations are exactly:

- `/init` — focused repository discovery and core project context.
- `/init --deep` — exhaustive evidence-backed discovery with research routing.

Reject every other flag or positional argument and print the two valid forms.

> Prewalk remains the progression authority. Discovery and preview are
> read-only. Do not create or modify files until a schema-backed checklist is
> accepted and handed to the executor.

## 1. Parse mode and establish scope

1. Parse `$ARGUMENTS` exactly. Empty means `default`; the sole flag `--deep`
   means `deep`. Do not infer undocumented modes.
2. Confirm the working directory and resolve the root with
   `pwd` then `git rev-parse --show-toplevel`; without Git, use the current
   directory and report that initialization is provisional.
3. Establish the allowed write scope before research:
   - `AGENTS.md`
   - `.pi/project/tech-stack.md`
   - `.pi/project/architecture.md`
   - `.pi/project/conventions.md`
   - `.pi/project/commands.md`
   - `.pi/project/research-baseline.md` (**deep only**)
4. Never include `.env`, credentials, runtime state, generated dependencies, or
   files outside this list without asking and revising the checklist.

## 2. Idempotency and safety contract

Inspect every target before proposing changes.

| Artifact | Default rule | Existing-file rule |
| --- | --- | --- |
| `AGENTS.md` | create concise operating instructions | merge missing facts; preserve user guidance and stronger constraints |
| `tech-stack.md` | regenerate detected facts | replace generated facts only; preserve explicit notes |
| `architecture.md` | create boundaries and execution paths | merge evidence-backed changes; mark uncertain claims |
| `conventions.md` | create observed conventions | merge; never turn one isolated example into a rule |
| `commands.md` | create verified commands | replace only commands directly found or successfully probed |
| `research-baseline.md` | skip in default mode | deep: refresh evidence while preserving `## Maintainer notes` |

Never overwrite blindly. If a file has no recognizable generated sections,
show a proposed merge and ask before replacing content. Never invent a command,
architecture boundary, dependency, provider, or verification result.

Safety rules that apply to every phase of this workflow:

- Never delete a file or folder without the user's written permission.
- Never run an irreversible command (`git reset --hard`, `git clean -fd`,
  `rm -rf`, force-push) unless the user states the exact command and confirms
  they understand the consequences, in the same message.
- Prefer non-destructive options (`git status`, `git diff`, `git stash`, copies)
  before any cleanup or rollback.
- If an approved destructive command runs, record the user's verbatim
  authorization, the command, and the time in the completion report.

## 3. Read-only discovery

Read the project's own context before asking the user anything:

1. `AGENTS.md` / `CLAUDE.md`, config files, and the project memory dir
   (`~/.pi/memory-md/<project>/` when present). Real architecture and house
   rules often live there.
2. `sources/` directories early — they may contain reference implementations
   or upstream code that defines the patterns to follow.
3. For upstream or mod source, clone the repository into `sources/` and read
   locally instead of fetching individual files.
4. Confirm the shell environment before running commands; note the shell the
   project actually uses (Bash, fish, zsh) before writing command guidance.

### Default mode

Build a bounded evidence inventory:

1. Repository state: root, branch, clean/dirty status, tracked top-level paths.
2. Runtime/package manifests and lockfiles; language/framework versions.
3. Entrypoints, public APIs, configuration, environment-variable names only.
4. Existing README, contributing docs, ADRs, CI, containers, deployment files,
   and local agent instructions.
5. Test layout and smallest setup/build/test/lint/typecheck commands.
6. Architecture sample: codemap skeleton/search/source/refs from one
   representative entrypoint to its downstream boundary.
7. Conventions: cite three consistent examples before calling a pattern a
   convention; otherwise label it “observed, not established.”
8. Generated files: identify anything auto-generated from a manifest or
   generator so the commands/conventions never treat generated output as
   hand-edited source.

Use codemap first for symbols and call paths. Use bounded grep only for raw text
or files outside the index. Do not install dependencies during discovery.

### Deep mode (`--deep`)

Perform every default step, then invoke `research-router` and
`workflow-deep-research` read-only:

1. Map all packages/apps, entrypoints, runtime boundaries, data stores,
   external services, CI/deploy paths, test layers, and generated-code seams.
2. Use codemap `refs` for public symbols and `cascade` for hotspots. Use CGC for
   available reference repositories.
3. Route external gaps precisely: Context7 for versioned library/API facts;
   DeepWiki for unfamiliar public repositories; OmniRoute for current web facts
   and official URL retrieval. Never external-search local code.
4. For each external fact capture question, repository/URL, exact tool ref,
   retrieval date, excerpt, authority, confidence, and decision impact.
5. Create a risk register: uncertain assumptions, stale docs, missing commands,
   failing probes, security boundaries, and recommended follow-ups.
6. Stop when every material architecture claim has a local source ref or an
   explicit uncertainty marker. More searching without a decision-changing
   fact is not progress.

## 4. Optional clarification interview

Ask only questions that repository evidence cannot answer. Batch them once
after discovery. Prioritize project purpose, users, deployment target,
non-negotiable constraints, and successful verification. If unanswered,
continue with explicit `Unknown` values—never fabricate answers.

## 5. Preview before mutation

Present a read-only preview containing:

1. detected project summary and confidence;
2. artifact actions (`create`, `merge`, `refresh`, `skip`);
3. exact write scope;
4. evidence table (`claim | local/external ref | confidence`);
5. commands to probe after writing;
6. unresolved questions and risks;
7. in deep mode, the lane/tool used for each external question.

Then submit a 5–9 item Ultra Fabric prewalk checklist with `intent`,
`references`, `localScope.files`, `invariants`, and `postconditions`. Wait for
accepted handoff. If acceptance is denied or scope changes, do not mutate.

## 6. Executor write phase

After accepted handoff, create `.pi/project/` and write only declared artifacts.

### `AGENTS.md`

Write project operating instructions for AI agents in this repository. Beyond
the project-specific facts, include a **universal rules baseline** so agents
behave consistently regardless of model. Adapt these rules; do not copy them
verbatim, and merge any stronger project-specific rules the user already has:

1. **User override (rule zero).** When the user gives a direct instruction, it
   overrides every convention below. The user is in charge.
2. **No file deletion / file safety.** Never delete a file without express written permission. Run
   no irreversible command (`git reset --hard`, `git clean -fd`, `rm -rf`,
   force-push) unless the user provides the exact command and confirms the
   consequences. Prefer non-destructive alternatives first.
3. **Communication.** Do not narrate tool calls. Do not echo file contents
   back. Keep explanations proportional to complexity. Avoid box-drawing
   characters; keep tables minimal.
4. **Workflow.** Check `sources/` directories early. Read the project's own
   context (AGENTS.md/CLAUDE.md, configs, memory dir) before asking intent
   questions. Use a formal planning workflow before non-trivial work.
   Implement the smallest slice that could work, then verify with tests or
   probes before expanding. Run tests after changes when a suite exists.
5. **Writing and response style.** All responses and output content must use
   ASD-STE100-style English that is easy to read. Use one name for each thing.
   Use active verbs and short common words. Write for the spoken voice. Vary
   sentence length unpredictably.

   Apply these exact restrictions to prose in responses, docs, commits, PRs,
   error messages, and generated instructions. Do not apply them to code,
   identifiers, command syntax, quoted user text, or required protocol fields:

   - No antithesis.
   - No corrective negation.
   - No paragraph pinning.
   - No parataxis.
   - No summary beats.
   - No rhetorical crutches.
   - No negative parallelisms.
   - No negative anaphoras.
   - No contrasting pairs.
   - No rule of three.
   - No em dashes.
   - No throat-clearing openers.
   - No landing sentences.
   - No setup/payoff constructions.
   - No parallel sentence structures within a paragraph.
   - No stacked noun phrases.
   - No filler intensifiers (`genuinely`, `really`, `truly`, `actually`).
   - No corporate-register verbs (`leverage`, `underscore`, `reflect`).
   - No nominalization.
   - No hedging qualifiers.
   - No performed enthusiasm.
6. **Accuracy.** Never present unverified claims as fact. After implementing,
   separate what was verified locally from what still needs confirmation on
   live servers, and name the servers and flags to check.
7. **Debugging.** Before proposing a root cause, list the symptoms any valid
   theory must explain, then pursue only theories consistent with all of them.
8. **Code intelligence.** Prefer semantic tools (codemap, language server)
   before text search. Before renaming or changing a signature, find all
   references and call sites. Use grep for strings, comments, and config. Check
   diagnostics after edits and fix type errors and imports.
9. **Secrets.** Never put secrets in instructions, messages, or agent payloads.
   Read them at runtime from env vars or config files. Never echo tokens in
   results.
10. **Git and PRs.** Keep commits and PR descriptions terse and matching
    repository conventions. Commit to the current or `main` branch unless the
    user asks for a new branch. Never reword the user's verbatim PR body or
    commit text without asking.
11. **Environment and shell.** Confirm the working directory before shell
    commands. Note the project's shell (Bash, fish, zsh) and its package
    manager (`npm`, `pnpm`, `bun`, `uv`, `cargo`) in `commands.md`.
12. **Memory and self-maintenance.** Keep `AGENTS.md` accurate when verified
    architecture, invariants, file maps, or procedures change. Update existing
    memory instead of creating duplicates. Do not save facts already
    represented by code, docs, or Git history. Make small instruction updates
    inline; mention changes of ten or more lines before making them.
13. **Agents and actors.** Do not spawn agents or invoke escalation workflows
    without a one-line user confirmation, unless the user already named that
    escalation. Keep agent instructions task-shaped and specific. Never put
    secrets in agent instructions.
14. **Session completion (landing the plane).** When ending a session: file
    issues for remaining work, run the project's quality gates if code changed,
    update issue status and sync any tracking system, and hand off context for
    the next session.

If the repository already has a strong AGENTS.md, merge missing rules instead
of replacing user-authored content, and note the merge in the preview.

### `.pi/project/tech-stack.md`

Languages/runtimes with versions and evidence; frameworks; package/build/test
systems (including the exact package manager the project uses); storage;
external services; deployment; tooling; unknowns.

### `.pi/project/architecture.md`

System context; package/module map; representative execution paths; data flow;
public interfaces; runtime/integration/failure boundaries; test architecture;
generated-code seams. Every non-obvious claim needs a file:symbol or file:line
ref.

### `.pi/project/conventions.md`

Naming, imports, types, errors, logging, async behavior, testing, fixtures,
configuration, migrations, and generated-code rules. Distinguish documented
rules, repeated observations, and recommendations.

### `.pi/project/commands.md`

Prerequisites; install; dev; build; unit/integration/e2e tests; lint/format;
typecheck; database; release/deploy; targeted checks; source and latest probe
result for each command. Note the shell syntax (`fish` vs Bash vs `zsh`) and
package manager (`npm`/`pnpm`/`bun`/`uv`/`cargo`). Mark unexecuted commands
clearly.

### `.pi/project/research-baseline.md` (deep only)

Scope/date/commit; local architecture evidence; external questions by lane;
authoritative refs and excerpts; dependency/version findings; risks;
uncertainties; stop rationale; future research. Preserve `## Maintainer notes`.
Never store secrets, tokens, or enormous raw tool output.

## 7. Verification

1. Confirm the working directory before running any shell command.
2. Re-read every changed artifact; resolve placeholders or mark `Unknown`.
3. Confirm paths, commands, and versions against repository evidence.
4. Run the smallest safe configured checks (tests, lint, typecheck) after
   writing; do not install or deploy unless the accepted checklist explicitly
   allows it.
5. Confirm `git diff --name-only` stays inside scope and no runtime state or
   credentials were created.
6. Separate what you verified locally from what still needs confirmation on
   live servers; name the servers and flags that must be checked before
   deployment.
7. Deep mode: sample at least three architecture/evidence refs and verify them.
8. If an irreversible command was authorized, record the user's verbatim
   approval, the command, and the time.
9. Repair failures within scope and rerun the failing check. A build alone is
   not completion evidence.

## 8. Completion report

Report mode and root; artifacts created/merged/refreshed/skipped; evidence and
confidence; commands probed with exact outcomes (and which were only
unconfirmed); unresolved risks; scope diff; any authorized destructive commands
with their recorded approval; and the next command (`/research`, `/create`, or
`/implement` only after its own accepted prewalk checklist).

Source adaptation: `/home/ryanj/work/inspo/opencode-template/.opencode/command/init.md`,
plus universal agent-rule patterns from the ACFS global instructions.
Strengthened for pi prompt syntax, codemap/CGC, provider-aware research, durable
project artifacts, and Ultra Fabric's mutation boundary.

