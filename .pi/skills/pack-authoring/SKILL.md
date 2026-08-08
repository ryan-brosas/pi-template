---
name: pack-authoring
description: Authoring and documentation router: writing or editing skills, documentation, ADRs, API and interface design.
tags: [pack, router]
---

# Pack: Authoring

Automatic router for authoring and documentation work. When a task matches this pack, read at most 2 most relevant leaf skills below (catalog rule `maxAutoLoadedLeafSkills`), apply them, then continue. Do not load leaves from other packs unless the task matches those packs too.

## Members

Leaves live in this directory: `.pi/skills/pack-authoring/<name>/SKILL.md`.

| Leaf skill | Use when |
| --- | --- |
| documentation-and-adrs | Use when writing documentation or ADRs. |
| writing-skills | Use when creating or editing skills. |

## Routing rules

1. Select at most 2 members whose description matches the task; prefer the most specific.
2. Read each selected leaf `SKILL.md` fully before acting; load its `references/` only when the active technique requires it.
3. For mixed-domain tasks, apply the other pack's router first, then this pack's leaf.
4. The user can always name a leaf directly: `/skill:<name>` — honor it even when it is not this pack's member.
5. If no member fits, do not force one; proceed with AGENTS.md general rules.

## Extending this pack

To add a skill: create `.pi/skills/pack-authoring/<name>/SKILL.md` with `disable-model-invocation: true`, add `<name>` to this pack's `members` in `.pi/skills/packs.json`, then run `node scripts/validate-skill-packs.mjs`. The validator fails with an actionable message if the leaf is unassigned, duplicated, or model-visible.
