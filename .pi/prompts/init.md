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
2. Resolve the root with `git rev-parse --show-toplevel`; without Git, use the
   current directory and report that initialization is provisional.
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

## 3. Read-only discovery

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

Purpose; repository map; setup and verified commands; code/test conventions;
architecture boundaries; security/data cautions; “do not” rules; Ultra Fabric
lifecycle; links to `.pi/project/*`. Keep it actionable.

### `.pi/project/tech-stack.md`

Languages/runtimes with versions and evidence; frameworks; package/build/test
systems; storage; external services; deployment; tooling; unknowns.

### `.pi/project/architecture.md`

System context; package/module map; representative execution paths; data flow;
public interfaces; runtime/integration/failure boundaries; test architecture.
Every non-obvious claim needs a file:symbol or file:line ref.

### `.pi/project/conventions.md`

Naming, imports, types, errors, logging, async behavior, testing, fixtures,
configuration, migrations, and generated-code rules. Distinguish documented
rules, repeated observations, and recommendations.

### `.pi/project/commands.md`

Prerequisites; install; dev; build; unit/integration/e2e tests; lint/format;
typecheck; database; release/deploy; targeted checks; source and latest probe
result for each command. Mark unexecuted commands clearly.

### `.pi/project/research-baseline.md` (deep only)

Scope/date/commit; local architecture evidence; external questions by lane;
authoritative refs and excerpts; dependency/version findings; risks;
uncertainties; stop rationale; future research. Preserve `## Maintainer notes`.
Never store secrets, tokens, or enormous raw tool output.

## 7. Verification

1. Re-read every changed artifact; resolve placeholders or mark `Unknown`.
2. Confirm paths, commands, and versions against repository evidence.
3. Run the smallest safe configured checks; do not install or deploy unless the
   accepted checklist explicitly allows it.
4. Confirm `git diff --name-only` stays inside scope and no runtime state or
   credentials were created.
5. Deep mode: sample at least three architecture/evidence refs and verify them.
6. Repair failures within scope and rerun the failing check. A build alone is
   not completion evidence.

## 8. Completion report

Report mode and root; artifacts created/merged/refreshed/skipped; evidence and
confidence; commands probed with exact outcomes; unresolved risks; scope diff;
and the next command (`/research`, `/create`, or `/implement` only after its
own accepted prewalk checklist).

Source adaptation: `/home/ryanj/work/inspo/opencode-template/.opencode/command/init.md`.
Strengthened for pi prompt syntax, codemap/CGC, provider-aware research, durable
project artifacts, and Ultra Fabric’s mutation boundary.
