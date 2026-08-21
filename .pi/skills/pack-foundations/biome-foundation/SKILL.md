---
name: biome-foundation
description: "Use when building linters/formatters/language tooling: lossless CSTs with green/red splits, flat formatter IRs with best-fitting printing, and rule engines with lazy diagnostics and positional suppressions."
disable-model-invocation: true
---
# Biome Foundation

## Solves
How biome ships Rust-speed linting/formatting for many languages from ONE architecture: a lossless CST core (rowan), a language-agnostic formatter IR with best-fitting printing, and a rule engine where cheap signal detection separates from expensive diagnostics.

## When to use
Building parsers/editors over syntax trees, formatters, linters, code-action systems, or any toolchain where losslessness, speed, and multi-language scale are requirements.

## Key skill-lines
- Lossless CST -> trivia as (kind,length) pieces pinned to tokens; green/red split with zipper cursors; fixed-slot arity with explicit holes; bottom-up hash-consing saving 17% memory (`references/cst.md`).
- Formatter -> flat 24-byte element stream with inline tags (size static_asserted), shadow-replay fits checking, BestFitting variants with documented quadratic cost, pointer-interned memoization, deferred source-map markers (`references/formatter-ir.md`).
- Analyzer -> five-method Rule state machine (cheap run / lazy diagnostic+action), kind-indexed dispatch tables, positional suppression pre-pass flagging unused ignores, services-as-scheduling-key (`references/analyzer.md`).

## Full view (memory graph)

Indexed in Codebase Memory as **`biome`** (`/mnt/hdd/utopia/inspo/biome`). 141,682 nodes / 644,530 edges; 4,549 Rust files; biggest packages: biome_js_analyze (8,718), biome_css_syntax (7,532), biome_js_formatter (6,125).

- `codebase_memory_get_architecture({ project: "biome", aspects: ["overview", "hotspots"] })`
- `codebase_memory_search_graph({ project: "biome", query: "<symbol>" })`
- `codebase_memory_check_index_coverage({ project: "biome", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/cst.md` — trivia pinning, green/red zipper, slot holes, hash-consing, text reconstruction.
- `references/formatter-ir.md` — element vocabulary, fits algorithm, BestFitting, Fill, interning bug post-mortem, source maps.
- `references/analyzer.md` — Rule anatomy, registry dispatch, suppression pre-pass, signal heap, services-as-phases, FixKind policy.

## Skill Result Contract

```xml
<skill_result>
  <skill>biome-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Lost whitespace fidelity, wrong fit verdicts, suppressed-but-emitted diagnostics, or none</risks>
</skill_result>
```