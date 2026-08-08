---
description: Run a pattern audit (agent-code-quality-gate + workflow-audit). Read-only; output a severity-ranked remediation list.
---

Invoke `agent-code-quality-gate` then `workflow-audit` (`.pi/skills/`). Pick a
cross-cutting pattern, sweep every occurrence, grade severity, and return a
prioritized remediation list. Read-only: do not mutate before the prewalk
checklist is accepted. Lifecycle progression stays with prewalk.
