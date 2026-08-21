---
name: foundations-workflow
description: "Use when turning an indexed repository or memory-graph project into a detailed foundation skill: graph-first deep-pass, source confirmation, lean SKILL.md + split references, and wiring."
disable-model-invocation: true
---
# Foundations Workflow

Turn an indexed repository / memory-graph project into a detailed, context-pack-ready foundation skill. This is the authoring process behind every leaf in this pack. **The memory graph is the primary lens — consult it at authoring time AND use time.**

## When to use

- A repo is indexed in Codebase Memory and has a proven, reusable primitive.
- You are adding a new foundation skill to `pack-foundations`.
- You need to double-check what a repo actually does before reusing it.

## The seven steps (at a glance)

1. **Inventory** — `list_projects`; record name/root/branch/nodes; index if missing (pass a clean `name`).
2. **Graph deep-pass** — `get_architecture`: overview, entry_points, hotspots, boundaries, languages, packages.
3. **Coverage check** — `check_index_coverage` on cited paths; never assume.
4. **Source grounding** — LICENSE + commit + the real primitives + tests (the contract).
5. **Write** — lean SKILL.md + split focused references under `references/`.
6. **Wire** — packs.json + router + manifest + README counts.
7. **Verify** — `node scripts/check.mjs` exits 0.

## References (load on demand)

- `references/workflow.md` — the full seven-step walkthrough with exact tool calls and extraction targets.
- `references/graph-rules.md` — the authoring-time double-check rule, the use-time Full-view mandate, coverage semantics, pitfalls.
- `references/skill-anatomy.md` — the target structure: lean surface anatomy, references split, validator constraints, provenance requirements.
- `references/wiring-verification.md` — packs.json/router/manifest/README wiring, the gates, common failures -> fixes.

## Skill Result Contract

```xml
<skill_result>
  <skill>foundations-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Graph deep-pass, coverage check, source reads, wiring, check.mjs exit 0</evidence>
  <artifacts>Foundation SKILL.md + split references + wiring</artifacts>
  <risks>Unverified claims, missed coverage, wrong wiring, or none</risks>
</skill_result>
```
