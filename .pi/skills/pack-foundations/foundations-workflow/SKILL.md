---
name: foundations-workflow
description: "Use when turning an indexed repository or memory-graph project into a foundation skill at localterm standard: staged pipeline with acceptance gates, worker-farmed studies, editorial prose assembly, catalog wiring, and verification."
disable-model-invocation: true
---
# Foundations Workflow

Turn an indexed repository / memory-graph project into a foundation skill at the **localterm standard** — the pack's quality bar. This is the authoring process behind every leaf in this pack. **The memory graph is the primary lens — consult it at authoring time AND use time.**

## When to use

- A repo is indexed in Codebase Memory and has a proven, reusable primitive.
- You are adding or deepening a foundation skill in `pack-foundations`.
- You need to double-check what a repo actually does before reusing it.

## The eight stages (each has an acceptance gate — do not skip ahead)

1. **Index** — `list_projects`; record name/root/branch/nodes; `index_repository` if missing.
   *Gate:* project listed with node/edge counts.
2. **Survey** — `get_architecture`: overview, entry_points, hotspots, boundaries. Crown 3-6 primitives by fan-in/cohesion, not by file size.
   *Gate:* crowned list with one-line justification each.
3. **Study** — read crown files IN FULL (`pi.read` offset/limit walks; never skim). Mine `TESTS` edges for probes; quote failure-mode comments verbatim; record exact line anchors. May fan out via `/skill:fabric-workflow` workers (`runner: 'pi'` — veda default breaks prompt handoff) with JSON-schema findings.
   *Gate:* every claim has an anchor; ≥3 patterns per area; ≥1 probe per pattern mined from tests.
4. **Editorial assembly** — workers return ORE; you write the DOCUMENT. Dissolve all scaffolding (WHO/WHAT/WHY bullets, P1/P2 numbering) into concept-named sections of flowing prose. See `references/quality-bar.md` — this step is where farms fail.
   *Gate:* reads like localterm's `secret-defense.md`; zero scaffold labels survive.
5. **Depth check** — a leaf at standard carries: provenance header per reference, 5W1H dissolved (not labeled), lessons + probes per section, and an explicit unmined-subsystems ledger in SKILL.md for future passes.
   *Gate:* compare against localterm side by side before proceeding.
6. **Catalog** — packs.json member → manifest sync script → router member line (restore, never amputate; budget is 300) → README counts (trust the validator's tree numbers over arithmetic).
7. **Verify** — `node scripts/check.mjs` exits 0.
8. **Ship** — `feat(skills): add X-foundation`; push.

## Hard rules

- The graph is an index, not truth: reconcile graph vs source; every discrepancy becomes a documented correction.
- Worker output ≠ documentation. Never transpose JSON fields into bullets.
- Routing descriptions are load-bearing: distinct terms per leaf, no collisions, restore don't trim.
- Log unmined subsystems honestly — depth debt is tracked, not hidden.

## References (load on demand)

- `references/workflow.md` — stage-by-stage runbook: exact tool calls, forge program shape, extraction targets, failure modes seen in practice.
- `references/quality-bar.md` — the localterm calibration: side-by-side anti-pattern vs correct rendering, the dissolution technique, probe mining.
- `references/graph-rules.md` — authoring-time double-check rule, use-time Full-view mandate, coverage semantics, pitfalls.
- `references/skill-anatomy.md` — target structure: lean surface anatomy, references split, validator constraints, provenance requirements.
- `references/wiring-verification.md` — packs.json/router/manifest/README wiring, gates, common failures -> fixes.

## Skill Result Contract

```xml
<skill_result>
  <skill>foundations-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Stages 1-7 completed with gates; quality-bar comparison done</evidence>
  <artifacts>Foundation SKILL.md + split references + wiring</artifacts>
  <risks>Scaffold leakage, unverified anchors, routing collisions, or none</risks>
</skill_result>
```