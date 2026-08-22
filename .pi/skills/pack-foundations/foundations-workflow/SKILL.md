---
name: foundations-workflow
description: 'Use when turning one indexed repository into a reusable foundation skill: graph-first discovery, source-confirmed implementation capsules, and behavior-tested reuse contracts.'
disable-model-invocation: true
---
# Foundations Workflow

**Code is ground truth; the skill is the retrieval map.** Use Codebase Memory to prewalk one active repository, then confirm only source/tests whose contracts the skill ships. A capsule gives a small model enough code-shaped context to port safely without pretending Markdown replaces the code.

## Scope discipline
Work **one source repository at a time**. Do not open the next graph project until the current one has fresh provenance, capsule/probe evidence, canonical-check results, plus either a behavior-test pass or an honest runner block.

## Seven acceptance gates
1. **Live index** - project/root/branch/commit/mode/counts/exclusions/freshness.
2. **Repo sweep** – census every module (package/crate/python dir) once: architecture, bounded search, traces; crown reusable contracts per module, repeat until the module is exhausted — no per-repo cap.
3. **Module coverage account** - coverage for every cited path; graph snippet; direct excluded tests; full-file reads only with a named uncertainty. Record each module as mined/skipped-with-reason/omitted in the durable work record, never as leaf-skill history.
4. **Implementation capsule** - per distinct porting question: Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve.
5. **Behavior test** - RED without the capsule, GREEN with it, adversarial compression; no runner = record the block + run deterministic retrieval/probe checks (never invent a pass).
6. **Wire** - update catalog only for new membership.
7. **Verify** - `node scripts/check.mjs` before closing.

## Durable leaf shape
A leaf is a stable capability/source map, not a project ledger. Group catalogued capsules by subsystem so a future task can load the right seam; end with a compact recipe for adding a new capsule. Keep module status, wave timing, and unresolved work in the durable work record.

## Token + stopping rules
Start with IDs/signatures + small limits; widen only on truncation. Never require a number of lines/references/citations/code excerpts; natural depth follows the porting question. Keep the canonical pinned commit; do not vendor modules. Stop the whole-repo sweep only when every module is accounted for in the work record and every public skill line has retrieval provenance, a confirmed anchor, a behavior boundary, and an honest coverage note. Volume tracks the module surface, never a quota; a small harness gets a small capsule, the whole repo gets as many as its seams demand.
