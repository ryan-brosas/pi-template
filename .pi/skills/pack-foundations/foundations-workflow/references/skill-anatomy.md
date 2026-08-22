# Foundation skill anatomy

A foundation is a lean retrieval surface backed by proven code. References are optional depth, not a completeness score.

## Layout

```text
.pi/skills/pack-foundations/<repo>-foundation/
├── SKILL.md
└── references/                 # only when a distinct porting question needs depth
    └── <question-or-subsystem>.md
```

One small repository may need no reference beyond the leaf. A large harness may need several. Count follows reusable contracts, never repository size.

## Lean `SKILL.md`

1. Trigger-first frontmatter and `disable-model-invocation: true`.
2. **Solves** — the recurring problem.
3. **Reuse map** — exact path/symbol, invariant, and named probe for each primitive.
4. **Full view (memory graph)** — project/root/branch/commit/mode/counts, caveats, and live query loop.
5. **References** — only the files that answer distinct porting questions.
6. **Adopt/adapt/omit** — constraints that affect reuse.
7. **Unmined** — honest queue of potentially valuable areas not studied.
8. Result contract.

Keep the leaf below the repository's warning threshold and remove any sentence that does not improve routing or reuse.

## Reference contract

A reference opens with provenance and coverage, then explains one porting question. It contains:

- graph-selected symbols and traces;
- source-confirmed invariants and failure boundaries;
- exact anchors close to claims;
- adopt/adapt/omit decisions;
- named tests or executable probes;
- known gaps.

Do not include worker output, study diaries, repeated glossaries, progress notes, or threshold commentary.

## What belongs where

| Content | Leaf | Reference |
|---|---:|---:|
| Trigger and solve | yes | optional expansion |
| Reuse symbol + invariant | yes | implementation detail |
| Live graph identity/caveat | yes | scoped coverage detail |
| Porting mechanics | summary | yes when non-trivial |
| Probe name | yes | setup/assertion detail |
| Constants and edge cases | only load-bearing | yes |
| Unmined areas | yes | no invented coverage |

## Provenance

Record owner, license, branch, commit/date, root, graph project, index mode/counts, and coverage state. Provenance can be centralized in the leaf and restated briefly in references so a loaded reference remains trustworthy.

## Catalog constraints

- Directory and frontmatter name match `<repo>-foundation`.
- Description begins with `Use when` and stays within metadata budget.
- Leaves stay hidden; routers remain visible.
- Packs own membership; regenerate the manifest only when membership changes.
- Router wording remains distinct from sibling leaves.

## Mechanical quality checks

The foundation validator checks evidence anchors, a verification/probe signal, provenance, scaffold leakage, and explicit padding language. It does not require a number of reference files or prose lines. Utility is established by the behavior pressure test, then `node scripts/check.mjs` guards repository structure.
