---
name: implementation
description: Executor-phase implementation guidance. Read the accepted checklist first, keep mutations inside declared scope, make small coherent edits, and verify with the smallest relevant checks. Use after prewalk accepts the checklist and hands off to the executor.
---

# Implementation

The executor owns implementation and verification after prewalk handoff. This
skill shapes how mutations happen; it never replaces prewalk authority.

## When to use

- After the prewalk checklist has been accepted and the executor owns the task.
- For any editing session inside a prewalk-driven task.

## Rules

1. Re-read the accepted checklist and its schema before the first edit; every
   mutation must map to a checklist item and stay inside `localScope.files`.
2. Batch only independent, bounded work; sequence search -> read -> edit -> verify.
3. Coalesce same-file replacements into one edit call.
4. Run the smallest relevant checks after each change; a build alone is not
   completion — probe the behavior directly.
5. Keep the diff minimal and confirm no out-of-scope behavior changed.
6. Acceptance evidence is required: each checklist validation must be executable
   and run before you claim completion.

## Steps

1. Load the accepted checklist; note the declared scope and invariants.
2. Implement item by item; after each, run its validation command.
3. For changed public symbols, run codemap refs/cascade to sweep every call site.
4. Before completion, run the full test module the change lives in, not just the
   test you expect to flip.

## Pitfalls

- Editing outside local scope, or before acceptance, is a lifecycle violation.
- Leaving a failing check unfixed and re-running it unchanged does not help:
  inspect the failure first.
- Silent env changes or stale artifacts can make checks pass for the wrong reason.
