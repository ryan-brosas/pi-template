# Biome — Analyzer Infrastructure Reference

Complete source-grounded reference for the rule engine shared by every language. Files: `crates/biome_analyze/src/{lib.rs, rule.rs, query.rs, registry.rs, signals.rs, context.rs, services.rs, matcher.rs}` (rule.rs read twice, 1,848 lines) plus representative rules in `biome_js_analyze/src/lint/suspicious/`.

## Rule anatomy: cheap run, lazy diagnostic/action

Every lint/assist/syntax rule implements one trait (`Rule: RuleMeta + Sized`, rule.rs:1313-1543) with four associated types — `Query`, `State`, `Signals: IntoIterator<Item = State>`, `Options` — and three methods: `run(ctx) -> Signals`, `diagnostic(ctx, state)`, `action(ctx, state)`.

The split exists because signals are QUEUED and may be discarded by suppression checks before emission (lib.rs:398-512). `run` executes during query matching and must be CHEAP; diagnostic/action materialize lazily only if the signal survives. Concrete anatomy (no_double_equals.rs): `type State = JsSyntaxToken` — run returns just the operator token (:104-120); diagnostic builds a RuleDiagnostic from it (:122-140); action builds a BatchMutation rewriting ==/!= to ===/!== (:142-160).

Rules are declared as empty types via `declare_lint_rule!`, which builds a const METADATA through builder-style const fns (:1010-1030). Doc examples double as tests: ```js,expect_diagnostic fences assert `foo == bar` produces exactly one diagnostic while `foo == null` produces none.

**Lesson:** split each rule into a cheap run yielding minimal State plus lazy diagnostic/action factories — never do expensive work in run when suppressions may discard the signal.

## Registry: type-erased dispatch keyed by TypeId or SyntaxKindSet

Registration walks category→group→rule via RegistryVisitor, computing each rule's phase and inserting a monomorphized fn-pointer executor either under `TypeId::of::<SyntaxNode<L>>()` indexed per raw SyntaxKind (from `QueryKey::Syntax(KIND_SET)`) or under the Input's TypeId for generic queries (:136-254). Matching is O(1) per node (:256-289).

Phases derive from SERVICES: "What defines a phase is the set of services that a phase offers" (:95-98) — Syntax phase offers nothing (rules run immediately); Semantic phase offers the semantic model and runs after full tree traversal. A rule selects its phase purely through its Query's Services associated type (`phase()` defaults via :1322-1324); `()` maps to Syntax.

A defensive unreachable documents an invariant AS the spec (:180-184): registering SyntaxNode as a TypeId key panics with "this is generally caused by an implementation of Queryable::key returning a QueryKey::TypeId with the type ID of SyntaxNode."

**Lesson:** encode dispatch as (TypeId | SyntaxKindSet) → vec-of-fn-pointers and derive scheduling phase from demanded services — registration paid once, per-node lookup constant-time.

**Probe:** the unreachable! panic text IS the contract for the misregistration case.

## Suppressions: a first-class ordered pre-pass, matched positionally

Phase 0 parses EVERY comment via a language-provided `SuppressionParser` fn before any syntax rule runs (:289-326). Four variants map from SuppressionKind: Classic→Line, All→TopLevel, RangeStart/RangeEnd (:630-650), with keys for category/rule/rule-instance/plugin (:709-719) and multi-rule comments documented (`// biome-ignore lint/complexity/useWhile lint/nursery/noUnreachable`).

Matching happens in flush_matches against a position-ordered signal queue (:398-512):

> "Search for an active line suppression comment covering the range of this signal: first try to load the last line suppression… otherwise perform a binary search over all the previously seen suppressions to find one with a matching range." (:474-480)

Instance-level suppression exists for per-call-site control (:1363-1374): "what if we wanted to suppress the rule for `a`, but not for `b`? … for rules such as useExhaustiveDependencies this is actually desirable." Two honesty mechanisms close the loop: UNUSED suppressions are flagged ("Suppression comment has no effect. Remove the suppression or make sure you are suppressing the correct rule.") and `<explanation>` placeholders are rejected (:524-530). Top-level comments after real code are denied via token-kind gating (:373-375).

**Lesson:** treat suppressions as data collected in a dedicated ordered pre-pass, matched positionally against a sorted signal queue — and report both unknown targets and unused suppressions so ignore-comments stay honest.

**Probe:** matcher.rs:201-380 builds trees with `//group`, `//group/rule`, `//unknown_group`, `//group/unknown_rule` and asserts exact diagnostic ORDER — "Suppression errors first since we check suppressions before syntax rules" — ending with suppressions/unused.

## Emission order: BinaryHeap keyed by start offset

Visitors discover matches out of order; users need source order. Every match pushes SignalEntry into a BinaryHeap whose Ord is REVERSED on start offset (matcher.rs:168-171), so peek/pop yields earliest-first without a global sort. A moving cutoff lets token-driven flushing interleave with traversal ("signals that start after this position will be skipped", lib.rs:396-397). The Break generic lets LSP consumers stop at first diagnostic while the Never empty enum makes no-break zero-sized (:946-973: "Option<Never> has a size of 0 and can be elided").

**Lesson:** queue signals in a min-heap keyed by start offset and flush with a moving cutoff — decoupling discovery order from emission order without sorting.

**Probe:** the matcher test asserts strictly increasing emitted ranges (47 < 63 < 76 < 97 < 110), indirectly verifying heap ordering.

## Services: the demanded service type doubles as the scheduling key

RuleContext resolves services at construction via FromServices (:41-44); failure yields ServicesDiagnostic "Missing services [SemanticModel] for the rule X" rather than a panic. The subtle design: demanding `SemanticServices` as your Query's Services SILENTLY PROMOTES the rule to the Semantic phase (semantic.rs:43-49) — the type system is the scheduler.

With an explicit warning against whole-model queries (:12-16): "Using this type as a Rule Query is discouraged, because it enforces the inspections of an entire document… Prefer Semantic<Node> to trigger the rule only for those nodes that might trigger it." The model itself builds in the SYNTAX phase via a builder visitor whose finish inserts it — skipped when the workspace already inserted one (:150-158). Flavor configuration happens mid-traversal because "visitor construction has no access to the service bag." (semantic.rs:106-108)

**Lesson:** make cross-cutting analysis state a typed service resolved at context construction — the demanded type doubles as the scheduling key, and node-scoped wrappers prevent accidental whole-file scans.

**Probe:** requesting a semantic-dependent rule in a syntax-only harness must yield exactly the ServicesDiagnostic message.

## Fixes vs suggestions: FixKind metadata, config narrows, severity belongs to the rule

FixKind is three-valued with verbatim semantics (:68-86): Safe = "safe to apply. Usually these fixes don't change the semantic of the program"; Unsafe = "unsafe to apply. Usually these fixes remove comments, or change the semantic." It converts lossily to Applicability (Safe→Always, Unsafe→MaybeIncorrect, None→Err). Config can only NARROW: `fix_kind: none` disables fixes while keeping suppression actions (:557-558); unconfigured passes the action's own applicability through (:597).

Severity deliberately has NO per-diagnostic setter in Rust rules (:1770-1775): "severity should _not_ be explicitly assigned, since rule categories and configuration define the severity. Currently, this is only used for plugins." RuleSignal force-overwrites severity from METADATA (:521) and appends advisory notes for WIP/nursery rules.

ActionMetadata defers mutation computation for LSP resolve flows: "Lightweight description of an available action, without the expensive [BatchMutation]" (:79-85) — ActionFilter bitflags gate which actions get computed at all.

**Lesson:** declare fix safety once in static metadata, let configuration only narrow it, keep severity a property of the rule not the call site, and lazily compute mutations behind action filters so resolve-based clients pay only for applied fixes.

**Probe:** no_double_equals' expect_diagnostic fence doubles as a fix test — the snapshot must contain the unsafe "Use === instead." action, and ignoreNull:false must make `foo == null` diagnose.
