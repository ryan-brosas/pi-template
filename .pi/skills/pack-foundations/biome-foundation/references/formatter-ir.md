# Biome — Formatter IR Reference

Files walked in full by the forge worker: `crates/biome_formatter/src/format_element.rs`, `crates/biome_formatter/src/format_element/tag.rs`, `crates/biome_formatter/src/format_element/document.rs`, `crates/biome_formatter/src/printer/mod.rs`, `crates/biome_formatter/src/printer/queue.rs`, `crates/biome_formatter/src/buffer.rs`, `crates/biome_formatter/src/formatter.rs`, `crates/biome_formatter/src/source_map.rs`, `crates/biome_formatter/src/builders.rs`, `crates/biome_formatter/src/macros.rs`.

Complete source-grounded reference for the language-agnostic formatting intermediate representation (all walked in full by the forge worker). Files: `crates/biome_formatter/src/{format_element.rs, format_element/tag.rs, format_element/document.rs, printer/mod.rs, printer/queue.rs, buffer.rs, formatter.rs, source_map.rs, builders.rs, macros.rs}` — all walked in full by the forge worker.

## The IR: a flat 24-byte element stream with paired inline tags

The entire vocabulary is one enum — `FormatElement` (format_element.rs:29-118): Space/HardSpace, Line(LineMode), ExpandParent, SourcePosition, Token{&'static str} for ASCII literals, Text{Box<str>}, LocatedTokenText (source-identical slices avoiding allocation), Mapped* variants carrying source positions, LineSuffixBoundary, Interned, BestFitting. Structure is expressed NOT by nesting but by Tag start/end pairs streamed inline (:tag.rs:8-77): Indent, Align, Dedent, Group{id, Cell<GroupMode>}, ConditionalContent, IndentIfGroupBreaks, Fill + per-item entries, LineSuffix, Verbatim, Labelled, Embedded.

Size is an enforced invariant with its own celebration:

> "Increasing the size of FormatElement has serious consequences on runtime performance and memory footprint… Is there a more efficient way to encode the data…? You reduced the size of a format element? Excellent work!" — backed by `static_assert!(size_of::<FormatElement>() == 24)` (:652-659); Tag is 16 bytes. Align payloads are boxed "to keep the payload one pointer wide" (tag.rs:262-264).

Text width is precomputed ONCE at construction (ASCII fast path byte-by-byte; unicode_width on a #[cold] slow path; '\n' → Multiline marker) and stored value+1 in NonZeroU32 so Option<Width> stays u32-sized (:355-424). Group mode mutability uses Cell<GroupMode> so propagate_expand flips Flat→Propagated in place through shared references (tag.rs:151-197).

**Lesson:** encode formatter IRs as flat element streams with paired inline tags and static_assert the element size; precompute per-text width once and push recompute cost to cold paths.

**Probe:** cargo test text_width asserts width("a\tb")==6 with indent 4, width("a\nb")==None, CJK width 6, zero-width-space width 2; any size growth fails the static_assert.

## Best-fitting groups: shadow-replay fits with cached verdicts

On StartGroup the printer decides flat vs expanded (:262-296): propagated-expanded prints expanded; a cached fits-verdict stays flat without re-measuring; otherwise it sets measured_group_fits, registers Flat, pushes a frame, and runs `fits()` — a SHADOW REPLAY of the remaining queue on top of the real PrintQueue without consuming it (queue.rs:157-166: "The queue is a view on top of the [PrintQueue] because no elements should be removed while measuring"), simulating line-width accumulation up to the first hard break.

The verdict cache invalidates at every emitted newline (:851-855): "Fits only tests if groups up to the first line break fit. The next group must re-measure." Measurer scratch stacks are reused across measurements ("Optimisation to avoid re-allocating a new vec everytime") guarded by a DebugDropBomb forcing finish().

One rule surprises everyone, verbatim (:1262-1312): even in flat mode, content DIRECTLY containing a hard/empty line returns Fits::Yes — "since that break is always going to exist, regardless of the print mode," with the worked leading-comment example and: "most comments inline for fills are used to separate _groups_ rather than to single out an individual element."

Forward references degrade gracefully during fits (unwrap_or_else(mode)) but PANIC in real print ("Expected group with id … to exist") — measurement leniency vs print strictness.

**Lesson:** implement fits-checking as a shadow replay of the same queue with cached verdicts invalidated at every newline; treat content-up-to-first-forced-break as fitting, matching Prettier semantics.

**Probe:** printer tests ~1690+: four array items fit on one line; nested indentation renders 2-space levels.

## BestFitting variants: N layouts, quadratic warning attached

`BestFittingVariants` holds N hand-authored layouts of the same content ordered most-flat-first, most-expanded-last (:407-475). Print tries each variant except the last via fits(), committing to the first that fits; none fits → last variant expanded (:533-600). Inside fits checks, BestFitting collapses to most_flat (flat mode) or most_expanded (expanded).

The cost model lives next to the macro (macros.rs:296-320):

> "Be mindful of using this IR element as it has a considerable performance penalty: multiple representations of the same content… The worst case complexity is that the printer tries each variant. This can result in quadratic complexity if used in nested structures."

Variants act as expansion BOUNDARIES for propagation (document.rs:44-130), and will_break() inspects only most_flat: "content is guaranteed to expand when even the most flat version contains some content that forces a break." The constructor is `#[doc(hidden)] unsafe` purely as API friction — "the method itself isn't unsafe but it is to discourage people from using it" (:443-450).

**Lesson:** offer multi-layout IR as an explicitly discouraged last resort with the complexity penalty written beside the macro; order variants flat-to-expanded; make variants opaque boundaries for expansion propagation.

**Probe:** macros doctest (~155-215) prints the same document at widths default/21/20 yielding three progressively exploded layouts — a direct variant-selection table test.

## Fill: separators break before items, comments don't isolate elements

Fill alternates StartEntry/EndEntry items with separators (:608-740). Each round classifies via FitsMeasurer::new_flat into FillPairLayout (:861-882): Flat (item+separator+next item all fit) / ItemFlatSeparatorExpanded / ItemMaybeFlat (re-measure separator Expanded) / Expanded. Priority verbatim (:608-618): "first expand the *separator* if the content exceeds the print width and only fallback to expanding the *item*s" — preserving trailing-comma style: break AFTER the comma, not before.

The hard case — ungrouped fill entries containing hard lines from leading comments — gets an extensive rationale (:1262-1312):

> "Here, -4 contains a hardline because of the leading comment, but that doesn't cause the element (-4) nor the separator (,) to print in expanded mode, allowing the rest of the elements to fill in. If this DID respect must_be_flat and returned Fits::No instead, the result would put the -4 on its own line, which is not preferable (at least, it doesn't match Prettier)… most comments inline for fills are used to separate _groups_ rather than to single out an individual element."

An optimization note avoids re-measuring the next item twice (:648-652).

**Lesson:** model fill layout as pairwise (item, separator) fit classification with separators breaking first, and special-case forced breaks inside entries so leading comments split groups instead of isolating single elements.

**Probe:** formatter.rs fill doctests (:160-203): four ~30-char tokens pack two lines at default width; soft_line separator variant proves separators expand before items.

## Interning: pointer-identity memoization and the boundary bug

`Interned` wraps Rc<[FormatElement]> with POINTER-based equality/hash (:255-270) — interning is manual, not content-hash dedup, "useful when the same content must be emitted multiple times to avoid deep cloning" (best_fitting!, if_group_breaks). intern_vec unwraps single-element results ("Doesn't get cheaper than calling clone"). Consumers memoize per-interned work keyed by pointer: propagate_expand caches expansion verdicts in FxHashMap<&Interned, bool>; RemoveSoftLinesBuffer keeps an original→cleaned interned cache ("It's fine to not snapshot the cache. The worst that can happen is that it holds unused elements").

The deepest failure-mode comment in the crate documents an interaction bug (:88-125): interned lists cache their expansion verdict based on `expands` AT THE END of iterating children — so a best_fitting occurring after the last expanding element could set expands=false, making the interned element think it doesn't expand "even though it might." Fix: DON'T reset expands=false at best_fitting boundaries — "just returning false here enforces that best_fitting doesn't think it expands ITSELF, but allows other sibling elements to still propagate their expansion." Regression test interned_best_fitting_allows_sibling_expand_propagation (:993-1040) fails if the reset returns.

Pointer-keyed caching is sound precisely BECAUSE interning is manual — equal-looking documents may legitimately differ in group modes, so content-hashing would be wrong.

**Lesson:** use pointer-identity Rc interning for duplicated fragments and memoize whole-subtree analyses by identity — but audit early-exit flag resets against cached subtree results; cache poisoning turns a local boundary into a global wrong answer.

**Probe:** cargo test interned_best_fitting_allows_sibling_expand_propagation; companion literal_line_break_is_forced_without_propagating_expand pins Literal lines setting will_break() while leaving GroupMode::Flat.

## Source maps: deferred markers + compressed deleted-ranges

Two fidelity layers. **Printer→output**: SourcePosition/Mapped* elements carry TextSize offsets; print_text emits SourceMarker {source, dest} BEFORE AND AFTER each token (:415-455). Markers are DEFERRED (:299-306): "Pushing the marker now would mean that the mapped range includes the indent range, which we don't want. Queue the source map position and emit it when printing the next character." Literal line breaks get dual markers mapping one source byte onto multi-byte CRLF output (:461-476).

**Transformed-tree→original-source**: TransformSourceMap stores DeletedRanges sorted by transformed_start with cumulative preceding-lengths — "significantly fewer memory than source maps that use a marker for every token" (:33-36) — O(log n) binary-search lookup with out-of-order tolerance (line-suffix comments print late: "It's not guaranteed that markers are sorted by source location… navigate backwards again", :186-235). extend_trimmed_node_range widens trimmed ranges so verbatim nodes re-include removed parentheses. Debug asserts catch implementation bugs directly: deleted bytes exceeding source offset is "a bug in the source map implementation."

**Lesson:** get cheap bidirectional fidelity by pairing deferred before/after markers per token with a compressed deleted-ranges map for tree transforms — never per-token source maps — and unit-test pathological orders (out-of-order deletions, backtracking markers, CRLF literals).

**Probe:** cargo test source_map — '(a + (((b + c)) + d)) + e' → 'a + b + c + d + e' offset mapping incl. out-of-order insertion; '((a));' trimmed query 'a' resolves to '((a))' after chained widening.
