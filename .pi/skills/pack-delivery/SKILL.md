---
name: pack-delivery
description: Delivery workflow router: implementing, planning, testing, shipping, prototyping, or development lifecycle work. Loads matching leaf skill on demand.
tags: [pack, router]
---

# Pack: Delivery

Automatic router for delivery and workflow work. When a task matches this pack, read at most 2 most relevant leaf skills below (catalog rule `maxAutoLoadedLeafSkills`), apply them, then continue. Do not load leaves from other packs unless the task matches those packs too.

## Members

Leaves live in this directory: `.pi/skills/pack-delivery/<name>/SKILL.md`.

| Leaf skill | Use when |
| --- | --- |
| development-lifecycle | Use when planning a project lifecycle, milestones, or development phases. |
| incremental-implementation | Use when implementing any feature or refactor touching more than one file. |
| planning-and-task-breakdown | Use when breaking a goal into tasks, estimating, or sequencing work. |
| prototype | Use when building a throwaway prototype or validating an idea. |
| shipping-and-launch | Use when shipping, releasing, launching, or productionizing. |
| source-driven-development | Use when building from a source template, reference repo, or vendored baseline. |
| spec-driven-development | Use when a spec or PRD exists and implementation must match it. |
| test-driven-development | Use when writing tests first, red-green-refactor. |
| testing-anti-patterns | Use when writing or changing tests, mocks, or test-only methods. |

## Routing rules

1. Select at most 2 members whose description matches the task; prefer the most specific.
2. Read each selected leaf `SKILL.md` fully before acting; load its `references/` only when the active technique requires it.
3. For mixed-domain tasks, apply the other pack's router first, then this pack's leaf.
4. The user can always name a leaf directly: `/skill:<name>` — honor it even when it is not this pack's member.
5. If no member fits, do not force one; proceed with AGENTS.md general rules.

## Extending this pack

To add a skill: create `.pi/skills/pack-delivery/<name>/SKILL.md` with `disable-model-invocation: true`, add `<name>` to this pack's `members` in `.pi/skills/packs.json`, then run `node scripts/validate-skill-packs.mjs`. The validator fails with an actionable message if the leaf is unassigned, duplicated, or model-visible.
