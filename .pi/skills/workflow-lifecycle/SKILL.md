---
name: workflow-lifecycle
description: End-to-end Ultra Fabric lifecycle for a feature or bugfix: research, spec, schema-backed checklist, acceptance, executor build, verification, and review. Use for any non-trivial task.
---

# Workflow: Development Lifecycle

The end-to-end Ultra Fabric lifecycle for a feature or bugfix. Adapted from the
opencode-template development-lifecycle workflow.

## When to use

- Any non-trivial feature, bugfix, or refactor.
- When the user asks to create, fix, audit, or ship work.

## Roles

- `scout` — read-only external research (docs, libraries, patterns).
- `explore` — read-only local search (codemap, grep).
- `plan` — read-only architecture and decomposition.
- `build` — the executor; the only role that mutates, and only after handoff.
- `review` — read-only verification and grading.

Read-only roles (scout, explore, plan, review) never mutate. `build` is the
only mutating role and runs strictly after prewalk handoff.

## Ultra Fabric prewalk

Prewalk is the sole progression authority. Research (scout/explore) produces
references and localScope for the schema. The schema-backed checklist gates
acceptance, mutation is blocked before it, and handoff appoints the executor.
The executor owns implementation and verification; review verifies before
completion is claimed.

## Workflow

1. **Research** — scout/explore; gather goal-backward evidence.
2. **Plan** — spec-driven development; decompose into checklist items.
3. **Checklist** — submit the schema-backed checklist to prewalk.
4. **Acceptance** — prewalk accepts; mutation is armed.
5. **Build** — executor implements with TDD in small batches.
6. **Verify** — run the full test module and the repository gate.
7. **Review** — structural review; refs/cascade, scope diff, gate.
8. **Audit/Gc** — optional cross-cutting pattern audit and garbage collection.

## Output

- Accepted checklist, executor evidence, and a verified completion report.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/workflows/development-lifecycle-workflow.md
adapted: synthesized into a pi skill; prewalk replaces custom progression; roles from .opencode/agent/*.md
license: opencode-template; see docs/sources.md
-->
