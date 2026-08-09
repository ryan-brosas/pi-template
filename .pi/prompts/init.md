---
description: One-time full project initialization — AGENTS.md, project.md, tech-stack.md, planning context, and user profile
argument-hint: "[--deep] [--context|--user|--all]"
---

# Init: $ARGUMENTS

Initialize project setup. Run once per project.

Plain `/init` runs the complete initialization: full deep discovery, then every
context artifact — AGENTS.md, project.md, tech-stack.md, roadmap.md, state.md,
user.md. Flags only narrow or repeat parts of that one-time run.

> **Next step for fresh projects:** `/plan` to create the first implementation plan.
> **Next step for existing codebases:** `/research` for deep codebase analysis, or just start describing what you want to build.

## Idempotency Rules

| File | Rule |
| --- | --- |
| `AGENTS.md` | Improve in-place — never overwrite blindly |
| `.pi/project.md` | Create if missing; ask before overwriting an existing file (holds product and architecture context) |
| `.pi/tech-stack.md` | Overwrite with detected values (auto-regenerated) |
| `.pi/roadmap.md` / `.pi/state.md` | Skip if exists, ask before overwrite |
| `.pi/user.md` | Skip if exists, ask before overwrite |

## Artifact Quality Contract

Every artifact a full `/init` writes must satisfy all of these:

1. **Minimum content per artifact.** Each artifact covers its full template section list. If a section has no verified content, write `[NEEDS CLARIFICATION: reason]` and ask the user; never silently drop a section.
2. **Project overview and Architecture are mandatory in AGENTS.md.** A full init renders the Project overview (one-sentence description plus essential facts) and an Architecture section (components and ownership, dependency direction, execution flows, boundaries, invariants, validation matrix) in `AGENTS.md`, with a pointer to `.pi/project.md` for the detailed record.
3. **Evidence citations.** Every project-specific claim, command, and restriction traces to a file:line, config entry, command output, or explicit user answer. A claim without a citation is a draft, not an artifact.
4. **Cross-file consistency.** Commands, counts, paths, and architecture terms agree across the prompt, templates, and all rendered artifacts. Detect and reconcile any disagreement before finishing.
5. **Preview material changes.** Show the user the final `AGENTS.md` (or the diff against the existing one) and the detection summary before writing; let them adjust.
6. **No invented facts.** Unknowns are marked `[NEEDS CLARIFICATION: reason]` and asked; do not guess versions, commands, branch policies, integrations, or user preferences.
7. **Verification.** After writing, run every recorded command and the repository gates, and report per-artifact results.

## Skills

Load the skill at `.pi/skills/brainstorming/SKILL.md`.
Load `.pi/skills/verification-before-completion/SKILL.md` after the artifacts are written.

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| (none) | — | Full deep initialization — every artifact, run once |
| `--deep` | true | Comprehensive research for every artifact (already the default) |
| `--context` | false | Planning context only (roadmap.md, state.md) — partial rerun |
| `--user` | false | User profile only (user.md) — partial rerun |
| `--all` | false | Full init — same as the default (kept for compatibility) |

**Mode rules:**
- No flags (default): the one-time full deep init — AGENTS.md, project.md, tech-stack.md, roadmap.md, state.md, user.md.
- `--deep`: explicit deep research; the default already runs it.
- `--context`: write roadmap.md and state.md only (partial setup or rerun).
- `--user`: write user.md only (partial setup or rerun).
- `--all`: same as no flags — full init.

**Brownfield auto-detection:** Existing codebase = a `src/`, `lib/`, or `app/`
directory, or standard language layouts (`.ts`, `.js`, `.tsx`, `.jsx`, `.py`,
`.go`, `.rs`, `.java`, `.cs`, `.rb`, `.php`, `.ex`, `.swift`, `.kt`,
`.dart`, `.sh`, ...). Affects discovery scope.

## Mode 1: Full Setup (Default)

### Phase 1: Deep Detect

Detect and validate, all in this one-time pass:
- Package manager and dependencies (with versions) — read the manifest, confirm the tool exists
- Build, test, lint, dev commands — validate each actually works before writing it anywhere
- CI/CD configuration — read workflow files, extract the job list
- Existing AI rules (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`)
- Top-level directory structure
- Git history (last 50 commits) for patterns (commit style, common areas of change)
- Source structure and subsystem candidates (codemap skeleton/explore)
- Entrypoints and composition roots (CLI, server, workers, scheduled jobs, event consumers)
- Import graph and dependency direction
- Common patterns (error handling, logging, data flow) from reading 3-5 representative files
- Data stores, schemas, and migrations
- External integrations (APIs, queues, object storage, auth providers)
- Deployment and runtime configuration (environments, health checks, rollback path)
- Testing patterns and coverage gaps (where tests live, what they cover)
- Security and trust boundaries
- Generated files and ignored state (what tools produce and must not be hand-edited)

### Phase 2: Preview Detection

Show the detected summary as a table and ask the user to confirm before writing:
**Proceed?** Write all six context artifacts with the detected configuration?
Options: Yes (write everything), Adjust (edit specific detected values first), Cancel (don't write anything).

### Phase 3: Create AGENTS.md

Load `.pi/skills/verification-before-completion/SKILL.md`.

Render `./AGENTS.md` from the source template at `.pi/templates/agents.md`:

1. **Copy the REQUIRED core verbatim** — universal safety and coding rules.
2. **Render the PROJECT CONTEXT block for every full init:** Project overview, Commands, Repository map, Architecture and dependency direction, Execution flows, Boundaries, Invariants, and Validation matrix. None of these may be omitted; mark unverified fields `[NEEDS CLARIFICATION: reason]` and ask.
3. **Keep only CONDITIONAL sections with local evidence.** For each conditional block, verify its trigger in this repository first, then record the evidence (file:line or command output) as a one-line note. Trigger sources: commands (run them), package manager (manifest present), branch policy (git config — ask the user), generated files (generator + output pair), external checkers (in scripts or CI), issue tracking (configured tracker), multi-agent coordination (user statement), deployment (deploy config), tool-specific rules (tool in PATH or config).
4. **Merge in place, never overwrite blindly.** If AGENTS.md exists, preserve its content; add, tighten, or remove sections only where the evidence or the user supports it. Never copy example restrictions from other projects into this one.
5. **Keep the architecture concise and operational.** AGENTS.md holds the operational view (style, entrypoints, flows, dependency direction, invariants, validation matrix) and points to `.pi/project.md` for the full architecture. Do not duplicate the full document.
6. **Preview material changes** — show the user the final AGENTS.md (or the diff against the existing one) before writing, and let them adjust.

**Detail is welcome, duplication is not.** Render as much verified detail as the project warrants — there is no line budget. Keep rules dense and non-redundant: prefer one sharp sentence over three vague ones, and do not repeat a rule already stated in the REQUIRED core.

**Principles:** Examples > explanations. Pointers > copies. Evidence before assertions: every project-specific command or restriction in the rendered file must trace to a verified file, command run, or explicit user statement.

### Phase 4: Create project.md

Render `.pi/project.md` from the source template at `.pi/templates/project.md`:

- Cover: purpose and status, success criteria, target users, core principles, system context (with trust boundaries), architecture overview (with component responsibilities, composition roots, dependency rules), runtime entrypoints, request/data/event flows, configuration, data ownership, external integrations, deployment topology, testing architecture, observability, failure modes, architectural invariants, decisions, known risks, open questions, evidence.
- Every claim traces to evidence (file:line, config entry, or command output) or an explicit user answer.
- Skip a section only when there is nothing to say; mark open questions `[NEEDS CLARIFICATION: reason]`.
- If `.pi/project.md` exists, merge: preserve user-authored content, add or tighten only what the evidence supports.

### Phase 5: Create tech-stack.md

Write detected values to `.pi/tech-stack.md` (overwrite with the fresh detection):

- Distinguish project dependencies from host tools: a host tool becomes a stack entry only when a manifest, script, workflow, or explicit user decision uses it.
- Record versions with evidence, per-command status (verified or none), CI, generated files, integrations, environments, constraints, and unknowns (`[NEEDS CLARIFICATION: reason]`).

### Phase 6: Create roadmap.md and state.md

Ask the user for project direction (vision, target users, success criteria) — reuse answers already given earlier in this run — then write `.pi/roadmap.md` and `.pi/state.md` from their templates. Include outcomes, dependencies, risks, and non-goals per phase in the roadmap; include verification state and working-tree context in the state file. Skip files that already exist unless the user asks to overwrite; preserve their user-authored facts when enriching.

### Phase 7: Create user.md

Ask the user (identity, communication preference, git workflow, approval boundaries), then write `.pi/user.md` from its template. Skip if it exists unless the user asks to overwrite; preserve its facts when enriching.

### Phase 8: Persist

Append to `.pi/artifacts/MEMORY.md` (under Decisions section):

```markdown
## YYYY-MM-DD Project initialized — [tech stack summary]

Full deep init completed: AGENTS.md, project.md, tech-stack.md, roadmap.md, state.md, user.md created for [language/framework] project.
```

## Mode 2: Planning Context Only (`--context`)

### Phase 1: Discovery (brownfield)

If the project has existing code (brownfield — see auto-detection above), run read-only codebase analysis directly:
- codemap skeleton/explore to map architecture patterns, data flow, domain boundaries, module structure.
- Read 3-5 representative files per subsystem to ground the map in real code.

If greenfield (no existing code), skip to requirements gathering.

### Phase 2: Requirements Gathering

Ask the user to define project direction:
1. **Project vision** — What is the project vision? (1-2 sentences)
2. **Target users** — Who are the primary users? (Developers, End users, Internal team, Both)
3. **Success criteria** — What defines success? (Stability, Speed, UX, Maintainability)

### Phase 3: Preview

Show the gathered requirements as a structured outline and ask for confirmation before writing files.

### Phase 4: Create Files

Write `.pi/roadmap.md` (vision, target users, feature roadmap with outcomes, dependencies, risks, non-goals) and `.pi/state.md` (current status, verification state, active decisions, next priorities). These files are for reference — they are not injected into prompts; use `read` on demand.

## Mode 3: User Profile Only (`--user`)

### Phase 1: Gather Preferences

Ask the user:
1. **Identity** — What is your name and role?
2. **Communication** — How detailed should AI responses be? (Concise, Detailed, Mixed)
3. **Git workflow** — How should git commits be handled? (Ask first, Auto-commit)
4. **Approval boundaries** — What actions require confirmation before execution?

### Phase 2: Preview

Show the captured preferences as a summary and ask for confirmation before writing.

### Phase 3: Create user.md

Write to `.pi/user.md` with the captured preferences. The file is for on-demand reference, not injected into prompts.

## Prewalk boundary

Detection, preview, and all interactive gathering are read-only. Before writing
any file, call `prewalk.checklist({ items, schema })` inside fabric_exec with 5-9
ordered items and an explicit schema contract; wait for accepted handoff, then
write the declared artifacts as the executor.

## Output

Report what was created and how it was verified. For each artifact state
created, updated, skipped, clarified, and verified:

1. AGENTS.md — created/updated in place; state the Project overview and Architecture sections rendered.
2. project.md — created/updated; state the sections covered and open questions marked.
3. tech-stack.md — regenerated; state detected dependencies vs host tools and command status.
4. roadmap.md + state.md — created/skipped; state the direction captured.
5. user.md — created/skipped; state the preferences captured.
6. Evidence — list the commands run and their results; name anything verified only by inspection.
7. Cross-file consistency — confirm commands, counts, paths, and architecture terms agree across artifacts, or list the disagreements.
8. Recommended next command: `/plan` to start planning, `/research` to explore the codebase, or just describe what you want to build.
