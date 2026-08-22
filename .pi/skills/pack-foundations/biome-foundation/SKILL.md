---
name: biome-foundation
description: "Use when building linters/formatters/language tooling: lossless CSTs with green/red splits, flat formatter IRs with best-fitting printing, and rule engines with lazy diagnostics and positional suppressions."
disable-model-invocation: true
---
# Biome Foundation

## Use this for
Linters, formatters, or language-server tooling that must round-trip source losslessly and reason over small, flat, memoizable IRs. Biome source and direct tests are ground truth; the capsules carry decisive excerpts and live graph retrieval.

## Load the matching source dump
- `references/cst.md` — trivia pinning, green/red zipper, slot holes, hash-consing, text reconstruction.
- `references/formatter-ir.md` — element vocabulary, fits algorithm, BestFitting, Fill, interning post-mortem, source maps.
- `references/analyzer.md` — Rule anatomy, registry dispatch, suppression pass, signal heap, services-as-phases, FixKind policy.

## Capsule map
- **Lossless CST** — `references/cst.md`: trivia as (kind,length) pieces, green/red split with zipper cursors, fixed-slot arity, hash-consing.
- **Formatter IR** — `references/formatter-ir.md`: flat element stream of fixed-width records, BestFitting variants, pointer-interning memoization, deferred source maps.
- **Rule engine** — `references/analyzer.md`: method-based RuleState, kind-indexed dispatch, positional suppression.

## Extending the foundation
Add one references-fileshaped capsule per new portable seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `biome` (`/mnt/hdd/utopia/inspo/biome`); 141,682 nodes / 644,530 edges; largest packages biome_js_analyze, biome_css_syntax, biome_js_formatter. Confirm every claim against source — the graph is an index, not truth.

## Boundaries
Adopt the CST/IR/rule abstractions and best-fitting printer; adapt syntax-tree libraries and AoT serialization; omit Biome-specific CLI, config, and language extensions unless a target requires them.
