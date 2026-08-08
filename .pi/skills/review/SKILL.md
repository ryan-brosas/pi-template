---
name: review
description: Structural review before completion. Rerun codemap refs and cascade on every changed public symbol, confirm the changed-file scope matches the checklist, and record file:line evidence in docs/verification.md. Use before claiming a task is done.
---

# Review

Review is the final prewalk phase: structural verification of the change before
completion is claimed. It is read-only and runs after tests pass.

## When to use

- Before reporting completion of a prewalk checklist.
- After any change that adds, renames, or resizes public symbols.

## Rules

1. Rerun codemap refs on every changed public symbol and cascade on the seed
   files; record the file:line results.
2. Confirm no out-of-scope file changed: the git diff must match the checklist
   localScope plus documented generated artifacts.
3. Re-run the full repository gate (tests + validators + typecheck) once more.
4. Record structural evidence in docs/verification.md: changed manifest, refs,
   cascade, and gate output.
5. Never bypass prewalk: review verifies, it does not re-approve or mutate.

## Steps

1. `git status --short` and `git diff --stat` to list the exact changes.
2. codemap refs + cascade for each changed public symbol; record file:line.
3. Run the repository gate; capture output.
4. Write docs/verification.md with the manifest and evidence.
5. Report completion only when acceptance holds; otherwise revise with evidence.

## Pitfalls

- Reviewing only the diff you expected misses side-effect call sites.
- Claiming completion without the gate passing is a lifecycle violation.
