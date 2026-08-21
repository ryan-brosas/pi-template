# Pi Upstream TUI — UX Internals (5W1H)

Source-grounded reference for `packages/tui/src` (~16.7k lines). Tranches read IN FULL so far: `stdin-buffer.ts` (444), `fuzzy.ts` (137). Each pattern: WHO / WHAT / WHEN / WHERE / WHY / HOW.

---

## 1. Stdin sequence buffering (the invisible reliability layer)

- **WHO** — every keyboard/mouse user; the entire rest of the TUI depends on it.
- **WHAT** — a buffer that accumulates raw stdin chunks and emits only COMPLETE terminal sequences, plus bracketed-paste extraction (`stdin-buffer.ts`, adapted from OpenTUI, MIT).
- **WHEN** — always; the module docstring shows the canonical failure it prevents: mouse SGR `\x1b[<35;20;5m` can arrive as three chunks (`\x1b`, `[<35`, `;20;5m`) and a naive parser reads each fragment as keypresses.
- **WHERE** — completeness classifiers :29-176 (`isCompleteSequence` dispatching per protocol), WezTerm workaround :216-233, dual timeouts :247-256/:418-426.
- **WHY** —
  - *Per-protocol completeness*: CSI ends on final byte 0x40-0x7E; OSC on ST or BEL; DCS/APC on ST; SS3 is ESC+one char; old-style mouse is a FIXED 6 bytes. One generic heuristic misfires; per-protocol parsers don't.
  - *The WezTerm Kitty quirk* (:216-233 comment): WezTerm sends Escape-key PRESS as a raw `\x1b` byte and RELEASE as a full Kitty CSI-u, concatenated: `\x1b\x1b[27;...u`. A generic parser reads `\x1b\x1b` as meta-key, leaking `[27;...u` as typed text. Fix: if the char after `\x1b\x1b` starts ANY protocol ([ ] O P _), emit ONE Esc and restart from the second.
  - *Two timeouts because two ambiguities*: 50ms for incomplete sequences vs 10ms for a lone ESC (Escape key vs Alt+key prefix). The ESC window is configurable UP for high-latency SSH where Alt+key chunks arrive late.
  - *Kitty echo dedup* (`pendingKittyPrintableCodepoint` :409-417): the Kitty protocol's printable-codepoint encoding would double-type a character once as CSI-u and once as the raw follow-up byte; the buffer remembers and suppresses the duplicate.
  - *Paste integrity*: bracketed-paste mode routes content to a `paste` EVENT (not keystrokes) so multi-line pastes never execute line-by-line; text BEFORE the paste marker still parses normally.
- **HOW** — `extractCompleteSequences` walks the buffer emitting complete sequences and keeping the remainder; leftover incomplete data flushes after its timeout; single high bytes (>127) convert to ESC+(byte−128) for legacy keypress parsing.

## 2. Fuzzy matching (scoring that mirrors intent)

- **WHO** — users picking models/files/commands from lists by typing fragments.
- **WHAT** — in-order subsequence matching with an intent-shaped score (lower = better) plus token AND-filtering (`fuzzy.ts`).
- **WHEN** — any filterable list; empty query passes everything through unsorted (never punishes browsing).
- **WHERE** — `fuzzyMatch` :14-95 (rewards :30-49, penalties :52-53, exact :66-68), swap fallback :70-92, `fuzzyFilter` :99-136.
- **WHY** —
  - *Score shape follows typing habits*: consecutive runs −5 each (escalating) because runs are deliberate; word-boundary hits −10 (boundary = string start or after `\s-_./:`) because acronyms are how people navigate; exact match −100 dominates. Gaps cost +2/char and later positions +0.1/char — earlier, denser matches feel like what you meant.
  - *The digit-swap fallback* (:70-92): model names (`gpt-4`, `4o`) make users type letter-digit orders interchangeably. When plain matching fails and the query is purely `letters+digits` or `digits+letters`, retry SWAPPED at a +5 handicap — forgiving without polluting normal ranking.
  - *Multi-token AND semantics* split on whitespace AND slashes: `api/client` must match both tokens — path-style queries behave like paths.
- **HOW** — greedy left-to-right query consumption over the lowercased text; all-token requirement with summed scores; stable ascending sort. No regex backtracking, O(n) per candidate.

## 3. Autocomplete (three domains, one provider)

- **WHO** — users typing commands, @-file-attachments, and paths into the editor.
- **WHAT** — a combined provider serving SLASH COMMANDS, @ ATTACHMENTS, and FILE PATHS with domain-specific trigger rules and cursor-exact application (`autocomplete.ts`, 786 lines, ~85% read).
- **WHEN** — trigger contracts differ BY DOMAIN: slash = line starts with `/` (natural); @ = token-start `@`, optionally inside unclosed quotes; paths = NATURAL trigger only when the prefix LOOKS like a path (contains `/`, starts `.` or `~/`, or empty right after a space) — otherwise Tab FORCE-completes anything (`extractPathPrefix` :516-541). Natural-vs-forced separation means users are never ambushed by suggestion popups while writing prose.
- **WHERE** — quote machinery :30-88, fd walk :90-152, `getSuggestions` :276-360, `applyCompletion` :362-451.
- **WHY** —
  - *Quotes change tokenization*: an unclosed `"` redefines where the current token begins (`findUnclosedQuoteStart`), so `@"src/a b` completes as a quoted unit; completed values RE-QUOTE when they contain spaces; `applyCompletion` handles the triple edge (quoted prefix + value ending in quote + quote already after cursor) by DROPPING one — never doubles quotes.
  - *Directories don't terminate*: applying a DIRECTORY completion adds NO trailing space (cursor backed up one when quoted) so the user keeps drilling in; files add the space that ends the token. Continuation vs termination is encoded in suffix choice (:407-410 comment).
  - *The tree walk is external and cancellable*: `fd` (respects .gitignore) spawns with SIGKILL-on-abort; `--full-path` only when the query contains `/`; `.git` excluded via flags AND result filtering (belt and braces); scoped queries (`src/fo`) split at the LAST `/`, verify the base dir exists with `statSync` BEFORE spawning, and display results relative to the typed prefix so suggestions always read as continuations of what's on screen.
  - *Commands delegate their arguments*: after the first space, the matched command's own `getArgumentCompletions(argumentText)` takes over — command authors own their arg UX; returning null silently drops back to no popup.
  - *Slash application inserts the space*: command completion appends `/name ` and advances cursor +2 — ready for arguments, matching shell convention.
- **HOW** — providers return `{items, prefix}`; `applyCompletion` classifies context (slash-command vs @-attachment vs command-argument vs bare path) from the REMAINING text around the prefix, then splices with exact cursor math per case.

## 4. Markdown rendering (streaming-aware)

- **WHO** — users reading assistant output as it streams.
- **WHAT** — marked-based terminal Markdown with LaTeX extension, streaming-safe fence handling, ANSI-aware wrapping (`components/markdown.ts`, 1,010 lines).
- **WHEN** — every assistant message render, INCLUDING partial ones mid-stream.
- **WHERE** — strict strikethrough :7-30, LaTeX tokenizers :48-144, `trimPartialClosingFences` :146-178, cache :245-247/:278-284/:363.
- **WHY** —
  - *Streaming is the normal case*: a code block's closing fence arrives ONE CHARACTER at a time; without `trimPartialClosingFences` (:146-178, issue #5825 referenced) the block visibly SHRINKS/flickers as each backtick lands. The trim recurses into list items and blockquotes because fences nest inside them.
  - *LaTeX must not eat prose*: `$` followed by a space, a digit after closing, ALL-CAPS env-var-like content, or a backtick inside → NOT math (:63-70). UNCLOSED dollar spans become `pending:` tokens only if they LOOK like math (`looksLikePendingDollarMath`: backslash commands or math symbols/operators) — so "price is $5 and" never renders as broken math mid-stream.
  - *Strikethrough is stricter than marked's default*: custom tokenizer requires non-space right after `~~` opening and non-tilde before closing, with escape awareness — `~~ a b ~~` stays literal.
  - *Wrap THEN style*: content renders to styled lines first, then wraps with `wrapTextWithAnsi` (ANSI-aware), then padding/background apply per wrapped line — styling before wrapping would break width math.
  - *Heading style contexts*: inline tokens (codespan/bold) restore HEADING styling after their own ANSI resets instead of falling back to default (:467-469 comment) — nested style recovery, not just application.
  - *Render cache keyed on (text,width)* since streaming changes text constantly — re-render only on real change.
- **HOW** — options preserve source list markers/backslash escapes when wanted; theme is a FUNCTION TABLE per element; `transform?(markdown, availableWidth)` hook lets callers rewrite source with exact width knowledge; hyperlinks/images gated by terminal capability detection.

## 5. Alt-screen transcript search

- **WHO** — users searching long scrollback in the alternate screen.
- **WHAT** — a corpus builder that maps search text BACK onto screen coordinates, enabling highlights across line boundaries (`alt-screen-search.ts`, 157 lines, full).
- **WHEN** — search invoked from keybinding; matches navigate next/previous with 1/N status in the inverted search bar.
- **WHERE** — corpus build :19-49, matching :66-92, match keys :94-99, component :101-157.
- **WHY** —
  - *Search must span lines*: queries cross row boundaries, so the corpus is one string PLUS a per-character SOURCE MAP `(row,startCol,endCol)`; whitespace runs collapse to single separators (marked mapless) so "foo bar" finds foo⏎bar.
  - *Coordinates are WIDTH-correct*: grapheme segmentation + `visibleWidth` per grapheme means wide chars (CJK/emoji) land on the right columns for highlighting.
  - *Adjacent segments coalesce* (:74-80): contiguous same-row spans merge so one match = one highlight rectangle, not per-character fragments.
  - *Stable identity*: `getAltScreenMatchKey` encodes first/last coordinates — dedup/navigation state survives re-renders.
- **HOW** — escaped-literal regex (never user regex), case-insensitive unicode; the search bar itself renders inverted (`\x1b[7m`) with label left / `N/M`·`No matches` status RIGHT-JUSTIFIED to width.

## 6. Keybindings (registry + declaration merging)

- **WHO** — users (familiar-key defaults); downstream packages (extension via TypeScript declaration merging on the `Keybindings` interface).
- **WHAT** — a typed registry of ~40 action ids → default key lists + descriptions (`keybindings.ts`).
- **WHEN** — all input handling; user overrides replace defaults by id.
- **WHERE** — interface :8-64, definitions :70+ (read to :120).
- **WHY** —
  - *Action ids over key handlers*: components bind to SEMANTIC actions (`tui.editor.deleteWordBackward`, `tui.altScreen.searchNext`), so rebinding never forks component logic; downstream packages ADD ids via declaration merging — extensibility through the type system.
  - *Every binding carries a human description* — settings/help surfaces generate themselves from the registry.
  - *Emacs/readline duality honored*: arrows AND ctrl+b/f/na/e equivalents both default; word-motion gets alt+arrow, ctrl+arrow, AND alt+b/f — three families of muscle memory supported simultaneously.
  - *Empty default arrays are deliberate* (`historyPrevious/historyNext: []`) — features exist in the registry but ship unbound until configured.
- **HOW** — `KeyId` strings parsed by `matchesKey`; multi-key defaults are alternatives, not chords; jump-forward/backward (ctrl+]) exposed as editor actions.

## 7. Editor (2,363 lines)

- **WHO** — every user typing prompts; the component everything else serves.
- **WHAT** — multi-line editor with atomic paste markers, serialized autocomplete, Emacs kill-ring, undo, history-with-draft, sticky-column vertical navigation (`components/editor.ts`).
- **WHEN** — always focused during input; special paths activate per situation (paste, history up/down, Tab).
- **WHERE** — class head :270-345 (all subsystem fields), marker-aware wrapping :44-205, history :428-462, autocomplete request pipeline :2177-2290.
- **WHY** —
  - *Large pastes are ATOMIC*: a pasted blob becomes a MARKER segment with an id; segmentation merges only markers with currently-valid ids (:379-385) so undone pastes degrade back to plain text gracefully. Cursor snaps to segment STARTS and `snappedFromCursorCol` remembers the pre-snap column so the NEXT vertical move lands where the user meant (:331-338 comment). An atomic segment wider than the terminal re-wraps at grapheme granularity but stays "logically atomic for cursor movement / editing — the split is purely visual" (:164-168).
  - *Stale async suggestions are impossible*: every autocomplete request gets a monotonic `startToken`, runs SERIALIZED behind the previous task (`await previousTask`), carries its own AbortController, and validates a FULL state snapshot (text+line+col) against current state before applying (:2266). Fast typers never see ghost popups.
  - *Debounce is contextual*: explicit Tab/force → 0ms immediately; natural triggers wait ONLY when the text matches the attachment-trigger pattern (`@`) — file walks don't lag plain typing (:2240-2248).
  - *Single-result Tab applies directly* (:2283-2290) with an undo snapshot pushed first — the fastest path commits safely.
  - *History browsing never loses work*: entering history `structuredClone`s the current state into `historyDraft`; returning to index −1 RESTORES it exactly (:436-455); entering also pushes an undo snapshot. Cursor placement differs by direction (Up→line start, Down→line end) matching how people scan.
  - *Emacs muscle memory*: kill ring + `lastAction` classification (kill/yank/type-word) powers yank-pop semantics; sticky `preferredVisualCol` keeps horizontal position across wrapped-line vertical moves; ctrl+] character jump mode.
- **HOW** — width-tracked rendering (`lastWidth`), scrollOffset clamping, dynamic border color, autocomplete list capped 3..20 visible (default 5) with trigger-character registration that filters `/`, whitespace, and duplicates.

