---
name: foundations-workflow
description: "Use when turning an indexed repository into a reusable foundation skill: graph-first discovery, coverage-aware source confirmation, behavior pressure tests, and concise reuse contracts."
disable-model-invocation: true
---
# Foundations Workflow

**Graph first, source final.** A foundation skill is a shortcut to proven code, not an encyclopedia about a repository. Use Codebase Memory to find the architecture and dependency shape, then confirm only the claims you will ship against source and tests.

## When to use

- An indexed repository contains a primitive likely to be reused.
- An existing foundation is stale, verbose, or weakly evidenced.
- A task needs a proven pattern and the skill should route future work back to it.

## Six acceptance gates

1. **Live index** — list projects, run `index_status`, and record project, root, branch, commit, mode, node/edge counts, exclusions, and freshness.
2. **Graph survey** — use compact architecture, bounded `search_graph`, and `trace_path` calls. Crown 3–6 reusable primitives by relationships and contract, not file size. Detect truncation before making exhaustive claims.
3. **Selective confirmation** — check coverage for every cited path. Prefer `get_code_snippet` for exact symbols. Read source ranges when a snippet is clipped or semantics cross symbols; directly search/read excluded tests. Full-file walks require a stated reason.
4. **Reuse verdict** — for each crown record **adopt**, **adapt**, or **omit**, with the constraint that drives the verdict. A skill line must name a path, symbol, guarantee, and probe.
5. **Behavior test** — RED: give an agent the reuse scenario without the new guidance and score the miss. GREEN: add the smallest skill/reference content that changes the decision. REFACTOR: compress and rerun an adversarial variant.
6. **Wire and verify** — update catalog files only when membership changes, then run `node scripts/check.mjs`.

## Token and stopping rules

- Start with IDs/signatures and small result limits; widen only on truncation or a named uncertainty.
- Do not produce a fixed number of references or lines. Create a reference only when it answers a distinct porting question that the lean skill cannot answer.
- Stop when every public skill line has provenance, a confirmed source anchor, a behavioral probe, and an honest coverage note. Unmined code stays an explicit queue.

## References

- `references/workflow.md` — exact graph-first runbook and fallback ladder.
- `references/graph-rules.md` — coverage, freshness, truncation, and use-time graph loop.
- `references/quality-bar.md` — utility rubric and RED/GREEN pressure test.
- `references/skill-anatomy.md` — lean surface, optional references, provenance, and validators.
- `references/wiring-verification.md` — catalog and canonical-check mechanics.

## Skill Result Contract

```xml
<skill_result>
  <skill>foundations-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Live graph state, coverage checks, source anchors, probes, RED/GREEN result</evidence>
  <artifacts>Lean foundation skill and only the references justified by reuse questions</artifacts>
  <risks>Stale index, excluded tests, unsupported claim, retrieval collision, or none</risks>
</skill_result>
```
