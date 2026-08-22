---
name: veda-foundation
description: "Use when building a coding-agent oracle/verifier: factored verification checks, model/backend resolution with aliases, parallel ensemble retries, and resumable checkpoint persistence."
disable-model-invocation: true
---
# Veda: Coding-Agent Oracle Foundation

## Use this for
Build a CLI oracle that a coding agent consults for planning, review, and deep-thinking: generate verification checks from a draft, answer them in isolation (factored verification), resolve a model+backend from aliases/prefixes/fallbacks, run parallel LLM ensembles with retry-on-empty, and persist resumable checkpoints. Source code and direct tests are ground truth; references carry decisive excerpts and graph retrieval. The repo's direct tests are excluded from the index by design (`fast-pattern`), so probes are named from the on-disk test files but the graph coverage caveat is stated in each capsule.

## Load the matching source dump
- `references/factored-verification.md` — generate checks, answer each in isolation, and revise a draft from contradictions.
- `references/model-resolution.md` — resolve backend+model from explicit args, aliases, model-name prefixes, fallbacks, and global config.
- `references/ensemble-retry.md` — run parallel LLM members, retrying once on empty output, preserving accumulated usage.
- `references/checkpoint-store.md` — persist and resume a deep-run checkpoint as YAML under a session lock.

## Capsule map
- **Verification** — `references/factored-verification.md`: difficulty→reasoning mapping, lenient XML check/result parsing, and the generate→answer→revise pipeline with partial resume.
- **Model resolution** — `references/model-resolution.md`: backend inference from model prefix, alias application rules, and the source-tagged resolution precedence chain.
- **Ensemble** — `references/ensemble-retry.md`: parallel member execution with one empty-output retry, fail-fast on errors, and usage accumulation.
- **Persistence** — `references/checkpoint-store.md`: versioned YAML checkpoint save/load/clear under a per-path lock.

## Extending the foundation
Add one `references/<seam>.md` capsule for one graph-selected, source-confirmed porting question. Add one matching loader line and map entry; keep evidence in the capsule, not this leaf. Each new capsule must carry Path/Symbol, Signature, Data Shape, a labelled decisive source excerpt, Flow, Invariant, a direct-test Probe, and a `search_graph` Retrieve.

## Provenance
Veda (`veda-ts`, MIT, `master@f050518c99fa54a5a0af4a04918aaf01d1ed94e1`); Codebase Memory project `veda` (fast index: 1,194 nodes / 3,690 edges, indexed 2026-08-15). Direct tests are excluded by design (`fast-pattern` skip-list); cited source files report `no_recorded_issue` + `metadata_match` (best-effort).

## Full view (memory graph)
Revalidate `veda` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source and direct tests decide shipped claims. The index excludes `tests/` and `src/stats/*.test.ts` by design, so direct-test probes are named from the on-disk files but are not graph-covered.

## Boundaries
Adopt the factored verification contract, the alias/prefix model-resolution precedence, the ensemble retry-on-empty semantics, and the locked YAML checkpoint store. Adapt backend names (codex/claude-code/pi/agy/droid), alias tables, and default models to the host. Omit the CLI/commands layer, prompt wording, judge/winner-rationale internals, and Glicko-2 rating logic unless a target needs them.
