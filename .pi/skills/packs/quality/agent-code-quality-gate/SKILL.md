---
name: agent-code-quality-gate
description: >-
  Use before a coding agent claims implementation work is complete, especially after bugfixes,
  feature edits, refactors, or subagent changes. Converts acceptance coverage, scope, duplication,
  behavior tests, verification evidence, and regressions into an operational gate.
version: 1.0.0
---

# Agent Code Quality Gate

## Iron Laws

<EXTREMELY-IMPORTANT>
- **Code-changed-this-session → review required.** Not optional.
- **Acceptance coverage = required.** Passing checks cannot excuse an incomplete request.
- **Scope = diff scope.** Unrelated cleanup in the diff = wrong diff.
- **Behavior tests = required.** No "trust me, it works."
- **Duplication check = required.** AI agents duplicate by reflex.
- **Verification evidence = required.** Agent ran the check, pastes output, human reviews.
</EXTREMELY-IMPORTANT>

## When to Use

Before declaring "done" after bugfix, feature edit, refactor, or subagent work. This is the automatic completion gate. Use `code-review-and-quality` separately only when the user requests review or an independent consequence-driven review adds value.

## The Gate (6 Checks)

1. **Acceptance coverage.** Map every requested outcome and acceptance criterion to complete,
   partial, or missing, with direct evidence. Any partial or missing item blocks completion unless
   the user changed the scope.
2. **Scope.** Does the diff match the stated problem? Anything outside → split or revert.
3. **Duplication.** Copy-paste instead of reusing? New file with high overlap? Flag for refactor.
4. **Behavior tests.** Exercise success and controlled failure through the public interface or seam. New behavior gets a test; a bug gets a regression test; a refactor preserves or strengthens equivalent black-box coverage.
5. **Verification evidence.** Named repository checks ran, exited 0, and their output was inspected. Child or graph claims do not satisfy this check.
6. **Regressions.** No new failures, unjustified test removal, skipped tests, dead code, or introduced duplication. Use configured deterministic analysis such as `fallow`; otherwise inspect source and diff and report that gate as N/A.

## Workflow

1. **Build the acceptance ledger.** List each requested outcome or criterion, its status, and its direct evidence.
2. **Get the diff.** `git diff` (or staged, or branch vs main).
3. **Scope check.** Is every line traceable to the stated problem?
4. **Deterministic quality check.** Run configured dead-code, duplication, and complexity analysis such as `fallow`; if none is configured or available, inspect the complete diff and mark the missing gate N/A.
5. **Black-box test check.** Verify public-interface success and controlled failure. For a refactor, prove equivalent observable coverage before accepting removed implementation-coupled tests.
6. **Verification check.** Run the repository-discovered commands and inspect their output.
7. **Regression check.** No new failures, unjustified removals, or skipped tests.
8. **Pass / fail.** If any acceptance item or other check fails, work is not done.

## Common Findings

| Finding | Action |
|---|---|
| Requested outcome is partial or missing | Finish it or record the user's explicit scope change |
| "While I'm here" cleanup | Split or revert |
| Copy-pasted helper | Extract to common module |
| New test that doesn't test | Rewrite or delete |
| Skipped test (`.skip`) | Un-skip or fix |
| Removed test | Add back, or justify |
| No regression test | Add one |
| Output truncated | Show full output |

## Severity Tells

| Tell | Action |
|---|---|
| `[blocker]` | Must fix. Violated invariant. |
| `[should-fix]` | Worth fixing now. Real cost. |
| `[nit]` | Cosmetic. Note, don't block. |
| `[question]` | Need clarification. |

## When to Override

| Override | When |
|---|---|
| "Scope creep is acceptable" | User explicitly approved the extra work |
| "Duplication is acceptable" | One-time use, extraction premature |
| "Skipped test is acceptable" | Flaky, in test-quarantine |
| "Removed test is acceptable" | Replaced by a better test |

Document every override in the task receipt and final evidence. Commit only when the user explicitly requests it.

## Common Mistakes

Skipping the gate; "I checked, it's fine" (no evidence); scope creep unmarked; tests that don't test; "I'll add tests later"; blockers downgraded to nits.

## Red Flags

"Should work" (run); "I tested it" (show run); truncated output; "tests later"; .skip on new; removed unmarked; "while I'm here" unmarked; scope creep unmarked.

## Anti-Patterns

**"I checked"** (no evidence); **"should work"**; **truncated output**; **"tests later"**; **.skip on new**; **removed unmarked**; **"while I'm here" unmarked**; **blockers unmarked**.

<!--
source: /home/ryanj/work/projects/pi-core/.pi/skills/agent-code-quality-gate/SKILL.md
adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved
license: pi-core private; see docs/sources.md
-->
