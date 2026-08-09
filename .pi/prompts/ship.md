---
description: Implement the active specification end to end with verification
argument-hint: "<id>"
---

# Ship: $ARGUMENTS

Implement the active specification end to end: read the spec, build in small verifiable batches, verify each batch, and report.
> **Workflow:** `/create` → `/plan` (optional) → **`/ship`** → `/verify`

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| `<id>` | active slug | Feature id from `.pi/work/.active` |

## Phase 0: Load Skills

Load the skill at `.pi/skills/pack-delivery/test-driven-development/SKILL.md`, then
`.pi/skills/verification-before-completion/SKILL.md`.

## Phase 1: Gather Context

Read `.pi/work/$(cat .pi/work/.active)/spec.md` to understand the requirements.

Read `.pi/work/$(cat .pi/work/.active)/` to check what plan artifacts exist (plan.md, research.md, design.md).

**Guards:**
- [ ] Spec exists and is up to date
- [ ] You have read the full spec

## Phase 2: Task Independence Check

Parse the plan (`.pi/work/$(cat .pi/work/.active)/plan.md`) if present, otherwise derive tasks from the spec. For each task record its `files` (from tasks.md metadata or the plan).

Group tasks:
- **Independent tasks** (no overlapping files) — run independent read-only discovery and checks in parallel batches; serialize all file mutations; one direct execution pass per task. Agents and subagents are unsupported: never dispatch one and never simulate delegation.
- **Dependent tasks** (shared or chained files) — run strictly in order.

If two tasks touch the same file, they are dependent regardless of what the plan says. Flag and serialize them.

## Phase 3: Task-Scoped Execution (TDD)

Run each task in dependency order through the task loop:

1. **Package** — state the task text, acceptance checks, permitted files, key symbols/invariants, and the smallest verification command before any edit.
2. **Implement** — write a failing test for the next behavior (project test conventions), then the minimal code to pass. Direct sequential edits in this session; serialize all file mutations.
3. **Acceptance review** — run every acceptance check, inspect output + exit code, and record command + output tail per task.
4. **Quality review** — read the diff as if a new teammate wrote it: intent, edge cases, naming, consistency, dead code.
5. **Correct (max two rounds)** — address findings with scoped edits; re-review only the original findings and the correction diff. New observations are notes, not round reopeners.
6. **Ledger** — append the outcome (checks, findings, rulings) to .progress.md and update the task list.
7. Stop on BLOCKED (same-approach failure twice, or a load-bearing finding past two rounds), plan conflict, destructive action, or ambiguity.

For independent tasks, run their read-only discovery and checks in parallel batches where tooling allows; keep all file mutations sequential and run the combined check once at the end.

**Rules:**
- Smallest working change, scoped to known territory
- No speculative abstractions or error handling for impossible scenarios
- Surgical diffs only — every changed line traces to the current request
- Unrelated issues get `NOTICED BUT NOT TOUCHING: ...` and move on
- For novel/unclear work: prototype, show variants, or ask before editing
- Never dispatch or simulate an agent/subagent for implementation or review

## Phase 4: Final Whole-Change Review

After the last task:
- Review the complete diff across tasks for integration breaks, duplicated seams, and spec drift.
- Re-check the current tree — other work may have landed.
- Run the project's full gate if one exists (tests, lint, typecheck, build).

## Phase 5: Verify

Run the change's verification commands and record exact outcomes. A build alone is not completion evidence.

Follow the verification protocol: `.pi/skills/verification-before-completion/references/VERIFICATION_PROTOCOL.md`.

**Failure handling:** if verification fails, fix or surface the failure — do not claim done.

## Phase 6: Report (output contract)

Append progress to `.pi/work/$(cat .pi/work/.active)/.progress.md`.

Output:
1. **Completed tasks** with per-task acceptance evidence
2. **Verification results** (typecheck/lint/test/build)
3. **Deviations** from the plan, with reasons
4. **Deferred work** with `TODO(handle): what, on-or-after <date>` markers
5. **Next step**: `/verify` to run the full gate, or fix listed issues

## Prewalk boundary

Reading and planning are read-only. Before the first edit, call
`prewalk.checklist({ ... })` inside fabric_exec with the matching disposition:
`trivial: true` for one or two small edits, `easy: true` plus 2-4 items and
Schema for bounded work, or 5-9 items plus Schema for full work; every
items-bearing checklist requires the Schema contract. Wait for accepted handoff,
then implement as the executor. Keep the checklist active until every item and
validation is complete; mark each with `[DONE:n]`. If acceptance is denied or
scope changes, do not mutate.

## Related Commands

| Need | Command |
| --- | --- |
| Create the spec first | `/create` |
| Deeper planning | `/plan` |
| Run the full gate | `/verify` |
