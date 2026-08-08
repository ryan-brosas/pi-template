---
name: research
description: Fabric-prewalk research phase. Map scope with codemap, gather goal-backward evidence, and produce the schema references that feed the prewalk checklist. Use before drafting any checklist.
---

# Research

Run the research skill **before the checklist is drafted**. Research is the first
phase of the prewalk lifecycle and never mutates the workspace.

## When to use

- At the start of any non-trivial task, before the prewalk checklist exists.
- Whenever the task needs references, evidence, or scope mapping first.

## Rules

1. Run research **before the checklist** is drafted; never mutate before the
   checklist is accepted by prewalk.
2. Explore with codemap first: `skeleton`, `explore`, `search`, `refs`, `cascade`.
   Fall back to grep only when the AST index cannot answer.
3. Read Pi docs and reference repos read-only when they inform the plan.
4. Record goal-backward evidence: file:line locators, docs paths, probe outputs.
5. Keep probes bounded: one realistic timeout, one attempt per uncertainty, and
   `settle: true` for expected nonzero results.
6. Never bypass prewalk: research produces inputs for the checklist schema
   (references, local scope, invariants, postconditions); it does not approve work.

## Steps

1. Map the repository: `codemap explore` / `skeleton` for structure and hotspots.
2. Resolve the exact seams that will change: `refs` on every symbol you may touch.
3. Read the authoritative docs for the interfaces involved.
4. For each open question record a reference with repository, question, and
   nonempty evidenceRefs (file paths or probe outputs).
5. Declare local scope: files, symbols, and cascadeRefs for the checklist schema.

## Output

- A schema contract with `references` (repository, question, evidenceRefs),
  `localScope` (files, symbols, cascadeRefs), `invariants`, and `postconditions`.
- The checklist items each carrying a concrete task and an executable validation.

## Pitfalls

- Research that mutates files defeats the lifecycle: keep it read-only.
- Unbounded digging: stop when each open question has at least one evidence ref.
- CGC/other indexes may be empty: fall back to direct read-only local inspection.
