---
name: workflow-deep-research
description: Bounded, evidence-driven research before any plan or checklist: scout/explore, source-quality hierarchy, goal-backward evidence, and schema references for prewalk. Read-only.
---

# Workflow: Deep Research

Bounded, evidence-driven research before any plan or checklist. Adapted from
the opencode-template deep-research workflow and scout/explore agents.

## When to use

- At the start of any non-trivial task, before a plan or checklist exists.
- When the task needs external docs, dependency source, or pattern evidence.

## Roles

- `scout` — read-only external research; source-quality hierarchy.
- `explore` — read-only local code search; retrieval budget.

## Ultra Fabric prewalk

Research is the first prewalk phase and is strictly read-only. Its output is
the schema contract for the checklist: references (repository, question,
evidenceRefs), localScope (files, symbols, cascadeRefs), invariants, and
postconditions. Research never approves work and never mutates.

## Workflow

1. Detect complexity; choose depth (L1 direct / L2 focused / L3 deep).
2. `explore` local scope first: skeleton, refs, cascade.
3. `scout` external sources when needed; prefer authoritative docs.
4. Record goal-backward evidence with file:line or doc paths.
5. Produce the schema references and local scope for prewalk.

## Output

- references + localScope for the prewalk checklist schema.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/workflows/deep-research.md
adapted: synthesized into a pi skill; scout/explore roles from .opencode/agent/{scout,explore}.md
license: opencode-template; see docs/sources.md
-->
