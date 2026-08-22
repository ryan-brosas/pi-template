# Foundation skill anatomy

A foundation is a lean retrieval surface backed by proven code. The source repo + its tests are ground truth; references add only the code-shaped context needed to reuse safely.

## Layout
```
pack-foundations/<repo>-foundation/
  SKILL.md
  references/<question>.md   # one distinct porting question each
```
Work one source repo at a time; count and length are set by reusable contracts.

## Lean SKILL.md
1. Trigger frontmatter + disable-model-invocation.
2. Solves. 3. Capsule/source map grouped by capability. 4. Extension recipe for one new capsule. 5. Full view (memory graph identity + caveats). 6. References. 7. Adopt/adapt/omit + boundaries. 8. Result contract.
Keep module status, wave timing, and unresolved work in the durable work record, not the skill. Remove any sentence that doesn't improve routing or reuse.

## Capsule reference contract
Starts with `<!-- capsule-v1 -->`, provenance, coverage, one porting question; carries the bold fields Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve. Optional `Porting shape` holds a minimal interface/pseudocode when the symbol alone is insufficient.
The validator enforces those fields only when marked. No line/reference/citation min- or max. Legacy references stay compatible until upgraded.

## What belongs where
Leaf: trigger, capability/source map, graph identity/caveat, extension recipe, porting summary, probe name. Capsule: exact flow + data shape, scoped coverage, mechanics, and minimal code shape when it prevents a wrong port. Work record: module coverage, wave timing, and unresolved work. Many full implementations stay in the source repo.

## Mechanical checks
The validator checks anchors, provenance, probe signal, capsule structure (when marked), scaffold leakage, and padding. Utility is by pressure test + `node scripts/check.mjs`.
