---
description: Review work before completion (verification-before-completion + agent-code-quality-gate). Read-only gate.
---

Invoke `verification-before-completion` then `agent-code-quality-gate`
(`.pi/skills/`). Re-run the change's verification commands, grade the diff
against the gate, and confirm the changed scope. Read-only: report findings;
progression stays with prewalk.
