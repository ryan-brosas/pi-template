---
description: Debug and fix a bug or failing test
argument-hint: "<description of bug or error>"
---

# Fix: $ARGUMENTS

Systematically debug and fix the reported issue.

## Load Skills

Load the skill at `.pi/skills/pack-quality/root-cause-tracing/SKILL.md`, then
`.pi/skills/verification-before-completion/SKILL.md`.

## Process

### Phase 1: Reproduce

Reproduce the issue with the exact steps or command given by the user. If the user gave no repro, build one from the report (error message, failing test, screenshot, log).

### Phase 2: Symptom Inventory

Before proposing a root cause, list every symptom the report and repro show:
- What fails, what still works?
- When did it start (recent change? always?)
- What inputs trigger it; what inputs do not?
- Any error text, stack, exit code?

A valid root-cause theory must explain all of these. If a theory explains one symptom but contradicts another, drop it.

### Phase 3: Trace to Root Cause

- Search for the error message or symptom in the codebase (`rg -n`, codemap search).
- Trace the execution path: entry point → handling → failing call, reading the 2-4 most relevant files.
- Read the callers and callees of the suspicious function; the bug is often in the boundary between components.
- Distinguish symptom from root cause: the error message is where it manifests, not necessarily where the bug lives.

### Phase 4: Fix (smallest root-cause fix)

- Apply the minimal fix for the root cause.
- Do not add speculative guards, tolerant readers, or defensive copies.
- Prefer making the bad state impossible over handling all bad states.
- If the fix requires touching multiple files, keep them in one focused change set.

### Phase 5: Regression Test

- Write a failing test that reproduces the bug (unit or integration, matching project conventions).
- Confirm it fails before the fix and passes after.

### Phase 6: Verify

Run the smallest relevant checks that exist: typecheck, lint, the failing test module, and any neighboring tests.

**Failure handling:** if verification fails twice on the same approach, stop and
escalate with what was learned — do not iterate blindly.

## Prewalk boundary

Discovery and reproduction are read-only. Before editing any file, call
`prewalk.checklist({ ... })` inside fabric_exec with the matching disposition:
`trivial: true` for one or two small edits, `easy: true` plus 2-4 items and
Schema for bounded work, or 5-9 items plus Schema for full work; every
items-bearing checklist requires the Schema contract. Wait for accepted handoff,
then apply the fix as the executor. Mark completed items `[DONE:n]`. If
acceptance is denied or scope changes, do not mutate. After verification, record the decision with `workflow.gate({ gate, passed, disposition, evidence })` (evidence kinds: command, artifact, trace, custom) and report the recorded decision.

**Dual mode.** Read-only discovery is identical in both modes; only mutation
authorization differs. Prewalk mode (armed): the flow above applies. Main-session
mode (no prewalk): prewalk is unavailable or not armed; propose each mutation to
the user and apply only after explicit approval of the exact action and files.
Detect at the mutation boundary: accepted checklist → prewalk mode; not-armed
rejection or absent `prewalk` → main-session mode.

## Output

Report:
1. Root cause (with file:line)
2. Symptoms explained by the theory
3. Fix applied (diff summary)
4. Regression test result (fails before, passes after)
5. Verification results (typecheck/lint/test output tails)
6. What else was considered and rejected

## Related Commands

| Need | Command |
| --- | --- |
| Verify gates | `/verify` |
| Audit a pattern | `/audit` |
| Research a topic | `/research` |
