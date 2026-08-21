# Biome — Rowan CST Core Reference

Complete source-grounded reference for the lossless syntax-tree core. Files: `crates/biome_rowan/src/` — green layer (`green/{node,token,trivia,node_cache}.rs`), cursor layer (`cursor.rs`, `cursor/{node,token,trivia}.rs`), `tree_builder.rs`, `syntax_node_text.rs`, plus the mutation region of `syntax/token.rs`. All walked in full by the forge worker.

## Lossless syntax: trivia as (kind, length) pieces pinned to tokens

Every token carries its FULL text — leading trivia, trimmed token text, trailing trivia — in one inline UTF-8 allocation (`ThinArc<GreenTokenHead, u8>`, green/token.rs:139-146). Trivia is not stored as text at all: `GreenTrivia` holds only `(TriviaPieceKind, length)` pairs (Newline, Whitespace, SingleLineComment, MultiLineComment, Skipped), and the actual characters are slices of the token's own buffer.

The identity rationale is verbatim (green/trivia.rs:61-67):

> "The identity of a trivia is defined by the kinds and lengths of its items but not by the texts of an individual piece. That means, that `\r` and `\n` can both be represented by the same trivia … This is safe because the text is stored on the token to which the trivia belongs."

Storing trivia as separate tree nodes would double node count; storing only lengths keeps GreenTrivia internable at exactly **8 bytes** (asserted by test at green/trivia.rs:186-189). `text_trimmed()` is pure offset math over the single string (:122-131).

**Lesson:** losslessness without node bloat — keep whitespace/comments out of the tree shape but pin them to tokens as (kind,length) piece lists over the token's own text buffer.

**Probe:** green/token.rs:209-218 builds token `"\n\t let \t\t"` and asserts text/text_len(9)/text_trimmed("let"); cursor/trivia.rs:164-180 asserts leading/trailing trivia texts separately.

## The green/red split: immutable shared tree + transient zipper

The **green** tree stores structure+text with relative offsets and NO parent pointers — built once by the parser, shareable across threads (vendored triomphe Arc). The **red** layer wraps each visited element in a heap NodeData recording slot index, absolute TextSize offset, and an Rc parent — a zipper over the purely functional tree (cursor.rs:1-8 says so explicitly: "Functional programmers will recognize that this module implements a zipper for a purely functional (green) tree").

Why split? Parent pointers in the shared tree would need updating everywhere on any edit. Making them transient means one green tree serves unlimited traversals while only currently-referenced paths pay for red nodes. Red nodes fabricate lazily from (parent Rc, slot index, relative offset); siblings are found by walking the PARENT's green slots from the current slot index (:170-215).

The unsafety boundary is documented with rare honesty (cursor.rs:14):

> "The implementation is utterly and horribly unsafe. This whole module is an unsafety boundary. It is believed that the API here is, in principle, sound, but the implementation might have bugs."

Child red nodes hold raw NonNull *weak* pointers to their green elements — sound because child→root→root-green→child-green forms a reference cycle keeping the green alive (:33-40).

**Lesson:** split position/parent state into a transient cursor layer so the persistent tree stays parent-free, trivially shareable, and immutable.

**Probe:** no direct zipper test, but identity semantics run everywhere: PartialEq/Hash compare (green ptr, offset) keys (:436-448), exercised by Preorder termination checks.

## Fixed-width slots: missing children become explicit holes

Every green node stores a fixed-length array of Slots — Node{rel_offset}, Token{rel_offset}, or Empty{rel_offset} — each exactly 2 words (static_assert :61). Empty slots arise from optional children or error-recovery drops:

> "Every node of a specific kind has the same number of slots to allow using fixed offsets to retrieve a specific child even if some other child is missing." (:190-191)

AST consumers get "the 3rd child of an if-statement" in O(1) regardless of parse errors; children iterators skip Empties while slot-indexed access does not. Construction fixup comment (:284-285): "XXX: fixup text_len after construction, because we can't iterate slots twice" — ThinArc can't iterate twice.

**Lesson:** give every node kind a fixed slot arity with explicit holes for missing children; positional access survives any amount of error recovery.

**Probe:** :531-558 builds a SEPARATED_EXPRESSION_LIST with a missing comma and asserts children().count()==2 but slots [0,2] (slot 1 empty); :560-566 asserts root.slots().len()==3.

## Immutable mutation: must_use splices with copy-on-write reuse

There is NO in-place edit API. Every mutation clones the affected node's slot vector, splices replacements, rebuilds a new green node, and returns a NEW detached root — marked `#[must_use = "syntax elements are immutable, the result of update methods must be propagated to have any effect"]` (:218-219, repeated across cursor/token wrappers). If the target's Rc refcount is 1, the existing allocation is REUSED in place (:324-325: "Try to reuse the underlying memory allocation if self is the only outstanding reference") — copy-on-write via refcount uniqueness. replace_child walks the parent chain rebuilding one node per level (O(depth), :342-381).

Purely functional updates keep old and new trees alive simultaneously — needed for batch edits and undo — while single-writer edits stay allocation-free.

**Lesson:** model tree edits as must_use functions returning fresh detached roots with refcount-based allocation reuse — immutability plus uniqueness gives both persistence and cheap single-writer mutation.

**Probe:** checkpoint misuse panics carry failure-mode strings: "checkpoint no longer valid, was finish_node called early?" / "…was an unmatched start_node_at called?" (tree_builder.rs:182-188).

## NodeCache: bottom-up hash-consing with manual hashes and generational GC

Parsers revisit identical subtrees constantly (keywords, punctuation); interning makes them pointer-equal shares. The cache dedups tokens by (kind, text), nodes with ≤3 children by (kind, occupied-slot child pointers) using PRE-COMPUTED child hashes, trivia by piece sequence (with a permanently pinned single-whitespace instance).

The design comment (green/node_cache.rs:151-166) is a masterclass:

> "hashing trees is fun: hash of the tree is recursively defined. We maintain an invariant -- if the tree is interned, then all of its children are interned as well. That means that computing the hash naively is wasteful -- we just *know* hashes of children… So here we use *raw* API of hashbrown and provide the hashes manually… Our manual Hash and the #[derive(Hash)] are actually different! At some point we had a fun bug, where we accidentally mixed the two hashes, which made the cache much less efficient. To fix that, we additionally wrap the data in Cached* wrappers."

The payoff cites Roslyn (:245-251): "Green nodes are fully immutable, so it's ok to deduplicate them. This is the same optimization that Roslyn does… For libsyntax/parse/parser.rs, measurements show that deduping saves 17% of the memory for green nodes!"

Cache eviction uses a generation bit packed into the low bit of the green pointer (:27-77): each build increments the generation; entries untouched this build are retained-or-evicted by retain_cache() (:346-360). Equality on collision compares kinds plus occupied-slot pointers only — Empty-slot PATTERNS encode error-recovery shape, so two nodes differing solely in which children are missing still compare unequal (deliberate; tests :210-262 assert pointer-identity for identically-broken conditions and assert_ne when one condition has the closing paren and the other doesn't). Size probes: CachedNode==16, CachedToken==8, CachedTrivia==8 (:365-369).

**Lesson:** intern immutable trees bottom-up with cached child hashes, guard the two hash schemes behind distinct wrapper types, and use a 1-bit generation stamp for O(1) mark-sweep of the intern table.

## Text reconstruction: the tree IS the source buffer

Because every byte lives in a token, printing a node = concatenating token texts in pre-order (green/node.rs:152-161). There is no separate source string and no positions to patch. SyntaxNodeText adds lazy chunk iteration (one &str per token intersecting a range), zero-copy slicing, and allocation-free equality against &str — including an optimization returning the single token directly when the range covers it whole (:157-165: "attempting to avoid an allocation if the node consists of a single token").

A formatter must emit output differing from input only where rules fired; deriving text from the tree guarantees printed output and analyzed tree can never disagree — and skipping the source-buffer copy matters at LSP keystroke scale.

**Lesson:** make the tree the sole container of source bytes so serialization is a token walk — then trimmed/untrimmed text, slicing, and equality all become offset arithmetic over existing buffers.

**Probe:** :300-330 builds trees from different chunk splits (check(&["hellowo","rld"], &["hell","oworld"])) and asserts chunked equality matches String equality; :333-355 asserts chars() concatenation across arbitrary boundaries.
