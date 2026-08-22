---
name: eslint-foundation
description: "Use when building a lint rule engine or flat-config linter: the verify pipeline, config loading/validation, RuleTester harness, and AST rule primitives."
disable-model-invocation: true
---
# ESLint Foundation

## Use this for
Flat-config lint pipelines, config resolution/validation, RuleTester-backed rule development, and AST walk helpers. Code and the full-indexed tests are ground truth; these references carry decisive excerpts plus live Codebase Memory retrieval calls.

## Load the matching source dump
- `references/verify-pipeline.md` — Linter.verify normalization, ESLint.lintFiles file discovery/worker scaling, config loading + flat-config validation.
- `references/rules-and-tester.md` — RuleTester harness and ast-utils rule primitives.

## Provenance
ESLint (MIT), `main@dc1e7a84`; Codebase Memory project `eslint` (14,207 nodes / 39,421 edges, full index — including tests). Core lib paths are graph-covered (metadata match).

## Boundaries
Adopt pure contracts and the API seams. Adapt provider/transport specifics (none for the linter core) and any local config schema. Omit docs tooling and internal experiment rules.
