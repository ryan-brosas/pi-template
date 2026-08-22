# Essential: How to Build Good Tests and Gates

Source: Discord conversation with scarywood75, 2026-08-03. A practical
methodology for building the mechanical enforcement from Pillar 4. Treat as an
essential.

## The core principle
**A test is only a good test if it can properly CATCH — a passing test means
nothing.** You have to test the un-fixed AND fixed version of your code.

## The rules
1. **Test the un-fixed and fixed versions.** Pre-fix should FAIL the test;
   after fix it should PASS. That proves the test actually catches.

2. **Don't create too many tests.** A test must be BROAD — target the TYPE of
   bugs/gaps/issues you want to fix, not specific things.

3. **Expand, don't duplicate.**** When something should've been caught by
   previous tests and wasn't, EXPAND those tests rather than creating new ones.
   Otherwise you get tons of duplicate or near-identical tests.

4. **Maintain a test list.** The LLM should maintain and update a list of tests
   and what they target, and check it every time something isn't caught.

5. **Test your test units.** Ensure they're made properly: avoid duplicates,
   use shared functions, avoid static values/lists in tests, avoid near-identical
   logic.

6. **Turn manual catches into mechanical tests.** Prompt the LLM to assess the
   workflow on every turn, so every manual catch becomes a mechanical test.

7. **Turn jerry-rigged scripts into workflows.** Every time the LLM jerry-rigs
   a script and uses it multiple times, turn it into a workflow.

8. **It evolves; never perfect.** You'll babysit a lot at first, but much less
   after.

## Judging "good" code
- **Using a GitHub repo (stars) is NOT the proper way to judge good code.** You
  need to research and determine yourself what result you want, what's important
  for you, identify gaps — then turn that into tests.
- **You need mechanical tests and gates** — otherwise you get mixed results, like
  asking a different coworker every day if someone does good work.

## Structural practices
- **Keep files small; group changes into cohorts** (break a larger problem into
  smaller, coherently-themed tasks). Improves pass rate, makes models think less.
- **Turn as much as possible into code.** Instead of asking the LLM to "order
  files this way," make a CLI tool to verify it and have the LLM call that.
  AI is good at making you think it gave proper results.

## What this means for our setup
- This extends Pillar 4 (enforce mechanically) into a concrete test-building
  methodology.
- The 7-gate foundations-workflow RED/GREEN tests ARE this: test the un-fixed
  (RED) and fixed (GREEN) versions.
- The structural-integrity check + autofix ARE this: mechanical, broad gates.
- For real code: build broad tests that catch types of bugs, maintain a test
  list, expand rather than duplicate, and turn manual catches into workflows.
