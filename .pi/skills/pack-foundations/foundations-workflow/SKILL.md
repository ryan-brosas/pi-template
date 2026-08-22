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
2. **Graph survey** - compact architecture, bounded search, traces; crown 3-6 reusable contracts.
3. **Selective confirmation** - coverage for every cited path; get_code_snippet; direct excluded tests; full-file reads only with a named uncertainty.
4. **Implementation capsule** - per distinct porting question: Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve.
5. **Behavior test** - RED without the capsule, GREEN with it, adversarial compression; no runner = record the block + run deterministic retrieval/probe checks (never invent a pass).
6. **Wire** - update catalog only for new membership.
7. **Verify** - `node scripts/check.mjs` before closing.

## Token + stopping rules
Start with IDs/signatures + small limits; widen only on truncation. Never require a number of lines/references/citations/code excerpts; natural depth follows the porting question. Keep the canonical pinned commit; do not vendor modules. Stop when every public skill line has retrieval provenance, a confirmed anchor, a behavior boundary, and an honest coverage note; name unmined areas.
