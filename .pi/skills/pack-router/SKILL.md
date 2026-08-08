---
name: pack-router
description: Route to the right skill pack and load the precise skill. Use when a task could match several skills or when the user names a pack (delivery, quality, agents, research). Skills live under .pi/skills/packs/<pack>/<skill>/SKILL.md and load via /skill:<name> or natural-language auto-load; prewalk remains the progression authority.
---

# Pack Router

This template organizes skills into **packs** (nested directories under
`.pi/skills/packs/`). Pi discovers `SKILL.md` files recursively, so every pack
skill registers its own `/skill:<name>` command and auto-loads when its
description matches the task.

## Packs

| Pack | Skills |
| --- | --- |
| `delivery` | brainstorming, spec-driven-development, test-driven-development, testing-anti-patterns, using-git-worktrees, workflow-lifecycle, workflow-batch-implement |
| `quality` | debugging-and-error-recovery, verification-before-completion, agent-code-quality-gate, api-and-interface-design, typescript-coding-standards, workflow-audit, workflow-gc |
| `agents` | capability-delegation, agent-observability, agent-supervision, writing-skills |
| `research` | research-router, omniroute-research, context7-docs, deepwiki-repositories, workflow-deep-research |

## How to trigger

- **Direct command:** `/skill:<name>` — e.g. `/skill:context7-docs`, `/skill:pack-router research`.
- **Natural language:** each skill's `description` drives auto-loading, so a
  task that mentions "how does X API work" loads `context7-docs`; "debug this
  failure" loads `debugging-and-error-recovery`.
- **Pack entry:** `/skill:pack-router research` prints this routing map.

## Routing decisions

- Unknown terrain or "start a feature" -> `delivery` (brainstorming, spec,
  lifecycle workflow).
- Fixing/verifying work -> `quality` (debugging, verification gate, quality
  gate, review workflows).
- Multi-agent orchestration -> `agents` (delegation, observability,
  supervision, skill authoring).
- Any external fact gathering -> `research` (see `research-router` for the
  provider lanes).

## Prewalk authority

Packs organize guidance only. Progression (research -> checklist -> acceptance
-> handoff -> executor -> verification) stays with Ultra Fabric prewalk; no
pack, skill, or prompt bypasses it, and research stays read-only.

<!--
source: /home/ryanj/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md
adapted: synthesized into a pi skill; pack layout and trigger semantics from Pi's recursive skill discovery
license: pi docs; see docs/sources.md
-->
