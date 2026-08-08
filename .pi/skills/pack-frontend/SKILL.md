---
name: pack-frontend
description: Frontend and UI router: React web UI, components, styling, design systems, accessibility, browser testing, mockup conversion, redesign.
tags: [pack, router]
---

# Pack: Frontend

Automatic router for frontend and UI work. When a task matches this pack, read at most 2 most relevant leaf skills below (catalog rule `maxAutoLoadedLeafSkills`), apply them, then continue. Do not load leaves from other packs unless the task matches those packs too.

## Members

Leaves live in this directory: `.pi/skills/pack-frontend/<name>/SKILL.md`.

| Leaf skill | Use when |
| --- | --- |
| accessibility-audit | Use when auditing or fixing accessibility. |
| browser-testing-with-devtools | Use for browser tests and UI verification. |
| browser-tools | Use for browser automation and interaction. |
| chrome-devtools | Use when debugging with Chrome DevTools. |
| design-system-audit | Use when auditing or building a design system. |
| design-taste-frontend | Use for frontend visual quality and taste. |
| figma | Use when working with Figma design files. |
| frontend-design | Use when building React-based web UI. |
| high-end-visual-design | Use for premium, agency-quality visual design. |
| industrial-brutalist-ui | Use for industrial or brutalist styling. |
| minimalist-ui | Use for minimalist visual styling. |
| mockup-to-code | Use when converting mockups or designs to code. |
| playwright | Use when running automated browser tests. |
| react-best-practices | Use when building or reviewing React components. |
| redesign-existing-projects | Use when redesigning an existing project. |

## Routing rules

1. Select at most 2 members whose description matches the task; prefer the most specific.
2. Read each selected leaf `SKILL.md` fully before acting; load its `references/` only when the active technique requires it.
3. For mixed-domain tasks, apply the other pack's router first, then this pack's leaf.
4. The user can always name a leaf directly: `/skill:<name>` — honor it even when it is not this pack's member.
5. If no member fits, do not force one; proceed with AGENTS.md general rules.

## Extending this pack

To add a skill: create `.pi/skills/pack-frontend/<name>/SKILL.md` with `disable-model-invocation: true`, add `<name>` to this pack's `members` in `.pi/skills/packs.json`, then run `node scripts/validate-skill-packs.mjs`. The validator fails with an actionable message if the leaf is unassigned, duplicated, or model-visible.
