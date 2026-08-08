---
name: workflow-batch-implement
description: Implement an accepted prewalk plan in small verifiable batches with TDD, run by the executor (build role) after handoff. Read-only roles never mutate.
---

# Workflow: Batch Implementation

Implement an accepted plan in small verifiable batches. Adapted from the
opencode-template batch-implement workflow and build agent.

## When to use

- Executor phase after prewalk accepts the checklist and hands off.
- Large plans decomposed into independent units.

## Roles

- `plan` — read-only; decomposition and batch sequencing.
- `build` — the executor; the only role that mutates, after prewalk handoff.
- `review` — read-only; gates each batch before the next.

## Ultra Fabric prewalk

This workflow runs inside the executor phase. Every batch maps to accepted
checklist items; no mutation happens before acceptance and none strays outside
`localScope.files`.

## Workflow

1. Re-read the accepted checklist; group items into small batches.
2. For each batch: write the failing test first (test-driven-development),
   implement, run the smallest relevant checks.
3. Review the batch diff (review role) before starting the next.
4. Record acceptance evidence per batch.

## Output

- Batched implementation with per-batch evidence.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/workflows/batch-implement.md
adapted: synthesized into a pi skill with prewalk authority; build role from .opencode/agent/build.md
license: opencode-template; see docs/sources.md
-->
