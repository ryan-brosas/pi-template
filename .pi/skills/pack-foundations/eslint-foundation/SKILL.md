---
name: eslint-foundation
description: "Use when building a lint rule engine or flat-config linter: the verify pipeline, config loading/validation, RuleTester harness, and AST rule primitives."
disable-model-invocation: true
---
# ESLint Foundation

## Use this for
A lint rule engine or flat-config linter: the verify pipeline, config loading and validation, a RuleTester harness, and AST rule primitives. Source and tests are authoritative; the capsule contract is the loadable dump for reuse.

## Load the matching source dump
- `references/verify-pipeline.md` — Linter.verify normalization, ESLint.lintFiles discovery/worker scaling, FlatConfig loading + validation.
- `references/rules-and-tester.md` — RuleTester harness and ast-utils rule primitives.

## Capsule map
- **Lint pipeline** — `references/verify-pipeline.md`: verify normalization, discovery/worker scaling, flat-config AI + validation.
- **Rule primitives** — `references/rules-and-tester.md`: RuleTester harness, shared AST-tree rules and CAN-be-gated utilities.

## Extending the foundation
Add one references-fileshaped capsule per new rule-mode seam (loader, map, decisive source, invariant, probe, retrieval).

## Provenance
Indexed in Codebase Memory as `eslint` (`/mnt/hdd/utopia/inspo/eslint`, main@dc1e7a84); 14,207 nodes / 39,421 edges, full index. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt flf-config flow and the verify/lintFiles seam; port the RuleTester contract; omit ESLint's CLI/plugin-ecosystem packaging unless a target requires it.
