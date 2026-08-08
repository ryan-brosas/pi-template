---
name: workflow-audit
description: Audit a cross-cutting code pattern end to end and return a severity-ranked remediation list. Read-only review role; feeds prewalk and the review phase.
---

# Workflow: Pattern Audit

Audit a cross-cutting code pattern end to end and return a severity-ranked
remediation list. Adapted from the opencode-template audit-pattern workflow.

## When to use

- Cross-cutting concerns: auth checks, error handling, API usage, logging.
- Before a review phase or when a class of bugs is suspected.

## Roles

- `review` — read-only grader; sweeps occurrences, grades severity.
- `explore` — read-only search specialist; locates every occurrence.

## Ultra Fabric prewalk

Auditing is read-only and feeds the prewalk schema (evidenceRefs) and the
review phase. Progression stays with prewalk; the checklist must be accepted
before any remediation mutation.

## Workflow

1. Parse the pattern and its acceptance criteria.
2. `explore` every occurrence (codemap search/refs, grep fallback).
3. For each occurrence grade: correctness, edge cases, security, error
   handling, conventions.
4. Rank findings by severity (blocking, major, minor, nit).
5. Output the remediation list as review evidence.

## Output

- Prioritized findings with file:line evidence.
- A candidate remediation checklist for prewalk.

<!--
source: /home/ryanj/work/inspo/opencode-template/.opencode/workflows/audit-pattern.md
adapted: synthesized into a pi skill with prewalk authority; role boundaries from .opencode/agent/review.md
license: opencode-template; see docs/sources.md
-->
