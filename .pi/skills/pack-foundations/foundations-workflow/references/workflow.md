# The Runbook (stage-by-stage)

Exact tool calls and extraction targets for the eight stages. Gates are defined in SKILL.md; this file is the how.

## Stage 1 — Index

```
mcp.codebase_memory.list_projects()            // names + nodes/edges per project
mcp.codebase_memory.index_repository({...})    // only when missing; pass a clean name
```

Record: project name (graph names may differ from dir names — `typescript-sdk` vs the spec site at `modelcontextprotocol`!), root, branch, node/edge counts.

## Stage 2 — Survey and crowning

```
mcp.codebase_memory.get_architecture({ project, aspects: ['overview','entry_points','hotspots','boundaries'] })
```

Read the FULL text, not the head. Crown 3-6 primitives using: hotspot fan-in, package cohesion/clusters, boundary edges, and your own judgment about what is REUSABLE (not merely big). Justify each crown in one line.

## Stage 3 — Study

Solo mode (small repos): walk crown files with `pi.read({ offset, limit })` until fully covered. Keep a scratch ledger of anchors as you go.

Forge mode (large repos): one `/skill:fabric-workflow` program:

- `workflow.configure({ name, description })`; `phase('Study', { total })`.
- One `agent()` thunk per crowned area; **`runner: 'pi'`** (the veda default drops prompts: "No prompt provided").
- Tools `['read','grep','find','ls']`. Attach a JSON schema: `{ area, files_read[], patterns[] }` where each pattern carries name_5w1h, who, what, when, where_anchor, why, how, lesson, verification_probe.
- The depth-brief must DEMAND: full-file walks via offset/limit, exact line anchors, verbatim failure-mode comments, tests mined into probes, 3-6 patterns, depth over breadth.
- Set `agentBudget` to workers+1; give a generous tokenBudget.

Known failure modes seen in practice:

| Symptom | Cause | Fix |
|---|---|---|
| "No prompt provided" from every worker | veda runner default | `runner: 'pi'` on every call |
| Worker returns prose instead of JSON | schema missing | attach schema; workers return validated objects |
| Findings thin/skimpy | brief too soft | re-run with the depth-brief verbatim from quality-bar examples |
| Output truncated mid-return | huge findings payload | read the saved `/tmp/pi-fabric-output-*/output.txt` for full text |

## Stage 4 — Editorial assembly

Open `quality-bar.md` FIRST. Then write each reference file fresh: concept-named sections, dissolved 5W1H, blockquoted verbatims, inline anchors, Lesson/Probe codas, provenance opening. Never transitive-format worker JSON.

Self-check before proceeding (all must hold):

- [ ] grep your own file for `**WHO**` / `- **` scaffolding — zero hits allowed
- [ ] every section has ≥1 anchor with real line numbers
- [ ] every section has ≥1 verbatim quote
- [ ] Lessons are portable principles, not summaries of the section

## Stage 5 — Depth check

Side-by-side: open localterm's secret-defense.md next to your new file. Compare: orientation paragraph, quote density, coda discipline, whether a porter could ACT on it. Fix gaps now — this is the cheapest moment.

Add the unmined-subsystems ledger to SKILL.md ("auth.ts (2,376 lines) and streamableHttp transports noted for future passes").

## Stage 6 — Catalog wiring

Order matters (later steps validate earlier ones):

1. `packs.json`: add member to pack-foundations members array.
2. Router (`pack-foundations/SKILL.md`): add ONE meaningful line per member — distinct terms, no collisions with sibling leaves, never amputate existing lines to make room (budget is 300 since the restoration commit).
3. `node scripts/sync-skill-manifest.mjs` regenerates manifest.json.
4. README counts: TRUST THE VALIDATOR, don't compute by hand — release-hygiene tells you tree numbers when you're wrong.

## Stage 7-8 — Verify and ship

`node scripts/check.mjs` → EXIT=0 → `feat(skills): add X-foundation` → push.

## Deepening passes (for existing leaves)

Same pipeline, stages 2-5 only, targeting either the unmined-subsystems ledger or flagged-thin references. Commit as `docs(skills): deepen X-foundation <area>`.
