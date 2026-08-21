# Pi Upstream TUI — UX Internals

Source-grounded reference for `packages/tui/src` (~16.7k lines). Studied files: `stdin-buffer.ts` (444 lines, full), `fuzzy.ts` (137 lines, full), `autocomplete.ts` (786 lines, ~85%), `components/markdown.ts` (1,010 lines, key ranges), `alt-screen-search.ts` (157 lines, full), `keybindings.ts` (320 lines, head), `components/editor.ts` (2,363 lines, class head + autocomplete + history regions).

## Input reliability: per-protocol sequence buffering

The entire TUI rests on `stdin-buffer.ts` — adapted from OpenTUI (MIT) — which turns raw stdin chunks into COMPLETE terminal sequences. Partial escape sequences arrive across chunks (the docstring shows mouse SGR `\x1b[<35;20;5m` arriving as three separate reads); naive parsers read fragments as keypresses. Completeness is classified PER PROTOCOL rather than by one heuristic: CSI ends on final byte 0x40-0x7E, OSC on ST or BEL, DCS/APC on ST, SS3 is ESC+one char, old-style mouse is a fixed 6 bytes.

One documented quirk is the WezTerm Kitty case (:216-233): WezTerm sends Escape-key PRESS as a raw `\x1b` byte and RELEASE as a full Kitty CSI-u sequence, concatenated as `\x1b\x1b[27;...u`. A generic parser reads `\x1b\x1b` as a meta-key, leaking the rest as typed text. The fix: when the character after `\x1b\x1b` begins ANY protocol starter ([ ] O P _), emit one ESC and restart from the second.

Two TIME-based ambiguities get separate windows: 50ms for incomplete sequences, 10ms for a lone ESC (Escape key vs Alt+pending-key), tunable upward for high-latency SSH Alt+key input. Kitty echo dedup (`pendingKittyPrintableCodepoint`) suppresses the printable-codepoint DUPLICATE the protocol produces, and bracketed-paste mode routes multi-line content to a paste EVENT so pastes never execute line-by-line.

**Lesson:** per-protocol completeness classifiers beat one generic heuristic; separate timing windows per ambiguity class; treat paste as an event, not keystrokes.

## Fuzzy matching: intent-shaped scoring

`fuzzy.ts` matches in-order subsequences with lower-is-better scores. The score shape mirrors typing habits: consecutive runs −5 each (escalating), word-boundary hits −10 (boundary = start or after whitespace/dash/underscore/slash/dot/colon), exact match −100; gaps cost +2/char, later positions +0.1/char. A digit-swap fallback handles model-name habits — when plain matching fails on a purely letters+digits or digits+letters query, retry SWAPPED at a +5 handicap (`gpt4` vs `4gpt`), forgiving without polluting normal ranking. Multi-token AND filtering splits on whitespace AND slashes so `api/client` behaves like a path. Empty queries pass everything through unsorted — browsing is never punished.

**Lesson:** a fuzzy score is a conversation with muscle memory; add forgiveness behind a handicap, not in the default matcher.

## Autocomplete: three domains, one trigger discipline

`autocomplete.ts` serves slash commands (line-start `/`), @-attachments (token-start @, optionally quoted), and paths — with NATURAL triggers only when the prefix looks like a path (contains `/`, starts `.` or `~/`, or empty-after-space), while Tab FORCE-completes anything. Users are never ambushed by popups while writing prose.

Quote-awareness runs through the whole stack: an unclosed quote REDEFINES the current token; completed values re-quote when they contain spaces; applyCompletion drops one quote in the triple edge (quoted prefix + value ending in quote + quote already after cursor). Directory completions add NO trailing space (cursor backed up one when quoted) so the user keeps drilling; files add the terminating space — continuation vs termination is encoded in the suffix choice. The tree walk is external (`fd`, respects .gitignore), SIGKILL-on-abort, `--full-path` only when the query has a slash, `.git` excluded by flag AND result filter, and scoped queries verify the base dir exists with statSync BEFORE spawning — suggestions always read as continuations of what's on screen. Slash application inserts `/name ` with cursor advanced +2, matching shell convention.

**Lesson:** natural-vs-forced trigger separation keeps suggestion popups polite; full-path continuation display plus domain-specific cursor math makes apply-completion feel native.

## Markdown rendering: streaming-aware

`components/markdown.ts` is marked + a custom extension set. Streaming is the NORMAL case, so a code block's closing fence arriving one character at a time would make the block VISIBLY SHRINK with each backtick — `trimPartialClosingFences` (:146-178, referencing issue #5825) trims the partial fence, recursing into list items and blockquotes. LaTeX detection guards against eating prose: `$` followed by a space, a digit after closing, ALL-CAPS env-var-looking content, or a backtick inside means NOT math; UNCLOSED dollar spans become pending-only when they look like math (`looksLikePendingDollarMath`). Strikethrough is stricter than marked's default (non-space after opening, non-tilde before closing, escape-aware).

Styling wraps AFTER word-wrapping (`wrapTextWithAnsi`) so ANSI codes never break width math; heading style-contexts restore themselves after inline token resets instead of falling back to defaults. The render cache keys on (text, width).

**Lesson:** streaming content needs parser-level partial-construct tolerance — trim unclosed fences, treat pending math conservatively, and wrap ANSI-styled lines width-aware.

## Alt-screen transcript search: coordinates for miles

`alt-screen-search.ts` (157 lines, full) makes search span lines by building ONE corpus string plus a per-character SOURCE MAP (row, startCol, endCol). Whitespace runs collapse to single separators (marked mapless) so `foo bar` finds `foo⏎bar`. Coordinates are width-correct (grapheme segmentation + visibleWidth per grapheme — CJK/emoji land on the right columns); adjacent same-row segments coalesce into one highlight rectangle. The escaped-literal regex means users never get regex semantics; the search bar renders inverted with a label left and N/M or No-Matches right-justified.

**Lesson:** cross-line search = one mapped corpus string; match stability comes from width-correct source maps, not string indexes.

## Keybindings: semantic ids over key handlers

`keybindings.ts` (head read) declares ~40 semantic action ids (`tui.editor.deleteWordBackward`, `tui.altScreen.searchNext`) with default key lists plus descriptions. Components bind to ACTIONS, so rebinding never forks component logic; downstream packages extend via TypeScript declaration merging on the Keybindings interface — extensibility through the type system. Every binding carries a human description so settings/help surfaces generate themselves. Emacs/readline duality is honored: arrows AND ctrl+b/f/n/a/e both default; word-motion gets alt+arrow, ctrl+arrow, AND alt+b/f — three families of muscle memory simultaneously. Deliberately EMPTY default arrays (`historyPrevious/historyNext: []`) ship features unbound until configured.

**Lesson:** registry-by-action plus description metadata makes bindings self-documenting and rebinding non-breaking.

## Editor: the invisible safety net

`components/editor.ts` (2,363 lines; class head and key regions read) is where the previous five patterns converge. Large pastes become ATOMIC marker segments with valid ids — segmentation merges only currently-valid ids so undone pastes degrade to plain text gracefully; cursor snaps to segment starts with snappedFromCursorCol remembering the pre-snap column; an atomic segment wider than the terminal re-wraps at grapheme granularity but stays "logically atomic for cursor movement/editing — the split is purely visual."

Autocomplete requests serialize behind a monotonic startToken with a full (text, line, col) snapshot validated on completion — stale async suggestions are impossible. Debounce is contextual (0ms for Tab/force, attachment-pattern-only otherwise); single-result Tab applies directly with an undo snapshot pushed first. History browsing snapshot-clones the draft and restores it exactly on return; entering pushes undo. Kill-ring + lastAction classification powers yank-pop; a sticky preferredVisualCol keeps the horizontal position across wrapped-line vertical moves; ctrl+] jump mode rounds out Emacs muscle memory.

**Lesson:** editor correctness lives in the seams — atomic paste markers, snapshot-validated async suggestions, draft-preserving history, and counted undo.

## Verification

Test surfaces: `fuzzy` scoring is pinned by vitest cases; stdin-buffer completeness by protocol-specific fixtures; autocomplete quote-math and base-dir statSync gating by unit harvests under the package; markdown streaming by the fence/LaTeX cases; alt-screen search by corpus/map assertions; keybindings via matchesKey round-trips.
