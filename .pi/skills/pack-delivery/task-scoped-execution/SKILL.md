---
name: task-scoped-execution
description: Use when executing a plan with two or more ordered implementation tasks, where each task needs acceptance review and bounded correction before the next begins.
disable-model-invocation: true
---

# Task-Scoped Execution

## Core Principle

One current-session executor runs each task as a compact package, reviews it against its acceptance checks, and corrects it in at most two scoped rounds before the next task starts. Agents and subagents are unsupported on this stack: never dispatch one and never simulate delegation.

## When to Use

- The plan has two or more ordered implementation tasks.
- Each task has checkable acceptance criteria and a known file set.
- Later tasks depend on earlier outcomes.

## When NOT to Use

- Single-slice change: use `incremental-implementation`.
- No plan yet: use `planning-and-task-breakdown` first.
- Review-only pass: use `code-review-and-quality`.

## The Task Package

Before touching any file, state each field for the current task:

- task text: one sentence of intent
- acceptance checks: commands or observable behavior
- permitted files
- key symbols, references, and invariants
- verification command: the smallest check that must pass

## The Loop

1. **Package** - write the task package from the plan. Do not start a task you cannot describe with a concrete acceptance check.
2. **Implement** - direct sequential edits in this session. Smallest change that passes the check; follow `test-driven-development`. Serialize all file mutations; parallelize only independent read-only discovery or checks.
3. **Acceptance review** - run every acceptance check, record command and output tail. A task is not complete without its evidence.
4. **Quality review** - read the diff as a new teammate would: intent, edge cases, naming, consistency, dead code. Tag findings as blocker, minor, or note.
5. **Correct (max two rounds)** - address findings with scoped edits, then re-review only the original findings and the correction diff. New observations are ledger notes, not round reopeners.
6. **Ledger** - append the outcome: checks run, findings, rulings, unresolved notes. Update the plan todo list.
7. **Next task** - proceed in dependency order. Re-run the combined check when two tasks share a seam.

## Stop Conditions

- BLOCKED: an acceptance check fails twice on the same approach, or a load-bearing finding survives two correction rounds.
- A plan conflict the executor cannot resolve.
- A destructive action or genuine architectural ambiguity: ask, do not guess.
- All tasks complete.

## Ledger Entry Format

```text
### YYYY-MM-DD task <id> - <title>
status: done | blocked | note
checks: <command> exit <code>
findings: <blocker|minor|note> <what>
rulings: <adjudication or fix>
```

## Final Whole-Change Review

After the last task, review the complete diff across tasks for integration breaks, duplicated seams, and spec drift. Then `verification-before-completion` and `shipping-and-launch` take over.

## Red Flags

Simulated delegation; per-task commit churn; acceptance by inspection instead of a run command; unbounded correction rounds; silent finding discard; parallel edits to the same file; starting a task without a package.

## Common Rationalizations

| Rationalization | Rebuttal |
| --- | --- |
| "It works, skip the acceptance run" | Unrun checks are claims, not evidence. |
| "One more round will converge" | Past the cap, rounds stop converging. Adjudicate. |
| "That finding is wrong, drop it" | Rulings go in the ledger; silent discards stay forbidden. |
| "I can fake a subagent call" | Delegation is unsupported; the executor is this session. |

## Skill Result Contract

```xml
<skill_result>
  <skill>task-scoped-execution</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Per-task acceptance runs and ledger entries</evidence>
  <artifacts>Task ledger, final whole-change review notes</artifacts>
  <risks>Unresolved load-bearing finding, missing acceptance evidence, or none</risks>
</skill_result>
```
