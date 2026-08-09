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
| `<id>` | active slug | Feature id from `.pi/artifacts/.active` |

## Phase 0: Load Skills

Load the skill at `.pi/skills/test-driven-development/SKILL.md`, then
`.pi/skills/verification-before-completion/SKILL.md`.

## Phase 1: Gather Context

Read `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` to understand the requirements.

Read `.pi/artifacts/$(cat .pi/artifacts/.active)/` to check what plan artifacts exist (plan.md, research.md, design.md).

**Guards:**
- [ ] Spec exists and is up to date
- [ ] You have read the full spec

## Phase 2: Task Independence Check

Parse the plan (`.pi/artifacts/$(cat .pi/artifacts/.active)/plan.md`) if present, otherwise derive tasks from the spec. For each task record its `files` (from tasks.md metadata or the plan).

Group tasks:
- **Independent tasks** (no overlapping files) — implement in parallel tool batches when the checks allow, but still one direct execution pass per task; never pretend to delegate to a subagent.
- **Dependent tasks** (shared or chained files) — run strictly in order.

If two tasks touch the same file, they are dependent regardless of what the plan says. Flag and serialize them.

## Phase 3: Implementation Batches (TDD)

Build in small verifiable batches:

1. Write a failing test for the next behavior (matching project test conventions).
2. Write the minimal code to pass.
3. Run the smallest relevant check (typecheck, lint, the test module) and inspect output + exit code.
4. Record acceptance evidence per task (command + output tail).
5. Repeat until all tasks pass.

For independent tasks, run the per-task checks in parallel batches where the project tooling allows, then run the combined check once at the end.

**Rules:**
- Smallest working change, scoped to known territory
- No speculative abstractions or error handling for impossible scenarios
- Surgical diffs only — every changed line traces to the current request
- Unrelated issues get `NOTICED BUT NOT TOUCHING: ...` and move on
- For novel/unclear work: prototype, show variants, or ask before editing
- If a batch fails twice on the same approach, stop and re-plan that task instead of iterating blindly

## Phase 4: Review and Merge

After each batch passes its checks:
- Review the diff as if a new teammate wrote it (intent, edge cases, naming, consistency).
- Re-check the current tree before merging — other work may have landed.
- Run the project's full gate if one exists (tests, lint, typecheck, build).

## Phase 5: Verify

Run the change's verification commands and record exact outcomes. A build alone is not completion evidence.

Follow the verification protocol: `.pi/skills/verification-before-completion/references/VERIFICATION_PROTOCOL.md`.

**Failure handling:** if verification fails, fix or surface the failure — do not claim done.

## Phase 6: Report (output contract)

Append progress to `.pi/artifacts/$(cat .pi/artifacts/.active)/progress.md`.

Output:
1. **Completed tasks** with per-task acceptance evidence
2. **Verification results** (typecheck/lint/test/build)
3. **Deviations** from the plan, with reasons
4. **Deferred work** with `TODO(handle): what, on-or-after <date>` markers
5. **Next step**: `/verify` to run the full gate, or fix listed issues

## Prewalk boundary

Reading and planning are read-only. Before the first edit, call
`prewalk.checklist({ items, schema })` inside fabric_exec with 5-9 ordered items
and an explicit schema contract; wait for accepted handoff, then implement as the
executor. Keep the checklist active until every item and validation is complete.
If acceptance is denied or scope changes, do not mutate.

## Related Commands

| Need | Command |
| --- | --- |
| Create the spec first | `/create` |
| Deeper planning | `/plan` |
| Run the full gate | `/verify` |
