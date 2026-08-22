---
name: eslint-foundation
description: "Use when building a lint rule engine or flat-config linter: the verify pipeline, config loading/validation, RuleTester harness, and AST rule primitives."
disable-model-invocation: true
---
# ESLint Foundation

## Use this for
Flat-config lint pipelines, config resolution/validation, RuleTester-backed rule development, and AST walk helpers. Code and the full-indexed tests are ground truth; these references carry decisive excerpts plus live Codebase Memory retrieval calls.

## Capsule map

### Lint pipeline
- Linter.verify normalization, ESLint.lintFiles discovery/worker scaling, flat-config loading + validation — `references/verify-pipeline.md`.

### Rule primitives
- RuleTester harness and ast-utils rule primitives — `references/rules-and-tester.md`.

## Extending the foundation
1. Load the matching reference, then pre-walk one uncovered seam in the indexed repo with Codebase Memory.
2. Add a source-backed capsule here (Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve) and put the decisive excerpt in the matching reference.
3. Record module coverage and open gaps in the durable work record, then run `node scripts/check.mjs`.

## Full view (memory graph)
Indexed in Codebase Memory as **`eslint`** — `main@dc1e7a84` (14,207 nodes / 39,421 edges, full index including tests). Core lib paths are graph-covered (metadata match). Re-run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet` before porting.

## Load the source dump
- `references/verify-pipeline.md` — Linter.verify normalization, ESLint.lintFiles file discovery/worker scaling, config loading + flat-config validation.
- `references/rules-and-tester.md` — RuleTester harness and ast-utils rule primitives.

## Provenance
ESLint (MIT), `main@dc1e7a84`; Codebase Memory project `eslint` (14,207 nodes / 39,421 edges, full index — including tests). Core lib paths are graph-covered (metadata match).

## Boundaries
Adopt pure contracts and the API seams. Adapt provider/transport specifics (none for the linter core) and any local config schema. Omit docs tooling and internal experiment rules.