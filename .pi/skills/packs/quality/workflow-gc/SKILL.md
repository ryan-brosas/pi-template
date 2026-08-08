---
name: workflow-gc
description: Analyze and grade codebase cruft (dead code, duplication, debt) and propose scoped cleanup items. Analysis is read-only; cleanup goes through prewalk.
---

# Workflow: Garbage Collection

Analyze and grade codebase cruft, then propose scoped cleanup. Adapted from the
opencode-template garbage-collection workflow.

## When to use

- Periodically, or when the codebase accumulates dead code, duplication, or
  debt.
- Before large refactors that touch many files.

## Roles

- `explore` — read-only; finds dead code, duplication, stale docs.
- `review` — read-only; grades each domain.

## Ultra Fabric prewalk

Analysis is read-only. Cleanup edits are proposed as checklist items and
happen only after prewalk acceptance.

## Workflow

1. Scan for cruft: dead exports, duplication, stale references, lint debt.
2. Grade each domain by impact and risk.
3. Propose scoped cleanup items with file:line evidence.
4. Optionally open the cleanup checklist for prewalk.

## Output

- Graded garbage report and a candidate cleanup checklist.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/workflows/garbage-collection.md
adapted: synthesized into a pi skill with prewalk authority
license: opencode-template; see docs/sources.md
-->
