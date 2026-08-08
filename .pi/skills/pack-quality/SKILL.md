---
name: pack-quality
description: Code quality and reliability router: refactoring, code review, cleanup, deep module design, defense in depth, deprecation, fallow analysis, performance, root-cause, type standards.
tags: [pack, router]
---

# Pack: Quality

Automatic router for quality and reliability work. When a task matches this pack, read at most 2 most relevant leaf skills below (catalog rule `maxAutoLoadedLeafSkills`), apply them, then continue. Do not load leaves from other packs unless the task matches those packs too.

## Members

Leaves live in this directory: `.pi/skills/pack-quality/<name>/SKILL.md`.

| Leaf skill | Use when |
| --- | --- |
| agent-code-quality-gate | Use before claiming implementation work complete. |
| api-and-interface-design | Use when designing APIs, interfaces, or contracts. |
| code-cleanup | Use when cleaning up, simplifying, or deduplicating code. |
| code-review-and-quality | Use when reviewing code or PRs for quality. |
| deep-module-design | Use when designing module boundaries or package structure. |
| defense-in-depth | Use when invalid data causes deep failures; validate at every layer. |
| deprecation-and-migration | Use when deprecating or migrating APIs or behavior. |
| fallow | Use when analyzing dead code, duplication, complexity, or blast radius in TS/JS. |
| improve-codebase-architecture | Use when improving architecture or reducing coupling. |
| performance-optimization | Use when optimizing performance or profiling. |
| root-cause-tracing | Use when tracing a failure to its root cause. |
| typescript-coding-standards | Use when writing or reviewing TypeScript. |

## Routing rules

1. Select at most 2 members whose description matches the task; prefer the most specific.
2. Read each selected leaf `SKILL.md` fully before acting; load its `references/` only when the active technique requires it.
3. For mixed-domain tasks, apply the other pack's router first, then this pack's leaf.
4. The user can always name a leaf directly: `/skill:<name>` — honor it even when it is not this pack's member.
5. If no member fits, do not force one; proceed with AGENTS.md general rules.

## Extending this pack

To add a skill: create `.pi/skills/pack-quality/<name>/SKILL.md` with `disable-model-invocation: true`, add `<name>` to this pack's `members` in `.pi/skills/packs.json`, then run `node scripts/validate-skill-packs.mjs`. The validator fails with an actionable message if the leaf is unassigned, duplicated, or model-visible.
