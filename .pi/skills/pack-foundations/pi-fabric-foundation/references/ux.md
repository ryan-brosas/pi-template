# Pi Fabric — UI/UX Internals (5W1H)

Source-grounded reference for `src/ui` (~18.5k lines). Tranches read in full: word-diff cluster (`smart-filter`, `emphasis`, `line-emphasis`), `spinner.ts`, `row-balance.ts`, `preview-lines.ts`, `transcript-sanitization.ts`, `widget.ts`. Each pattern: WHO / WHAT / WHEN / WHERE / WHY / HOW.

---

## 1. Word-diff emphasis

- **WHO** — every human reading an edit in the transcript; authors porting diff views.
- **WHAT** — intra-line highlighting of changed token ranges between paired -/+ lines, with a confidence gate and a noise filter (`word-diff/emphasis.ts`, `smart-filter.ts`).
- **WHEN** — only for PAIRED changed lines inside a change block (`analyzeChangedLineBlock`); never for unpaired lines; `wordEmphasis: off|tokens|smart` config selects level.
- **WHERE** — `word-diff/emphasis.ts:14-22` (`shouldEmphasizeChangedPair`), `smart-filter.ts:10-27` (`filterLowSignalWordEmphasis`), alignment in `token-alignment.ts`/`line-matching.ts`.
- **WHY** — wrong highlights destroy trust faster than no highlights: pairs whose token ALIGNMENT is low-confidence get no emphasis at all (:16-18). And routine edits produce noise — syntax keywords and wrapper-call names would highlight on every touch.
- **HOW** — two gates in series: (1) CONFIDENCE — `collectChangedTokenGaps` yields ranges + confidence; low → drop; low ranges only survive on high-confidence LINES. (2) SMART FILTER — keep a range only if it carries signal tokens (identifiers, numbers, meaningful operators/symbols); LOW_SIGNAL_SYNTAX_TOKENS (`as const else export from function if import let var`) and WRAPPER_CALL_TOKENS (`filter flatMap forEach map reduce`) are dropped UNLESS the opposite side of the pair has signal or the range has intrinsic operator/symbol signal. Adapted from pi-code-previews (attribution noted in-file).

## 2. Spinner

- **WHO** — user watching an active run; implementers needing progress indication without state.
- **WHAT** — four-frame half-circle spinner, 250ms cadence (`spinner.ts`).
- **WHEN** — any running/in-progress status glyph.
- **WHERE** — `spinner.ts:4-19`; consumed by `widget.ts:11` via `statusGlyph` fallback.
- **WHY** — wall-clock PHASE LOCKING: frame = `floor(now/250) % frames`, so re-render timing jitter can NEVER desync animation or cause double-advance; timer fires aligned to the NEXT boundary (`delay = INTERVAL - (now % INTERVAL)`) so ticks land exactly on frame edges; `.unref()` so the animation never holds the process open.
- **HOW** — pure `spinnerFrame(now)` + one self-clearing setTimeout per activation; stopping clears the timer and returns the current static frame.

## 3. Hidden row borrowing (row balance)

- **WHO** — users scrolling a live transcript where tool results stream then finalize.
- **WHAT** — when a finalized result renders FEWER rows than its streaming partial did, neighboring preview components may GROW into the freed space instead of the layout visibly collapsing (`row-balance.ts`).
- **WHEN** — deficit exists only when `finalized && partial && final` all measured; deficit = max(0, partialRows − finalRows) at equal width.
- **WHERE** — `row-balance.ts`: `HiddenRowBorrowingComponent.render` :20-49, `observeResultRows` :51-60, `resultRowDeficit` :62-70.
- **WHY** — transcripts that jump/shrink mid-read feel broken; silent whitespace looks like a bug. Borrowing converts reflow into a calm, bounded expansion.
- **HOW** — a `PartialResultObserver` records the MAX rows seen while streaming (per width); after finalize, borrowers scan candidate limits baseLimit+1..maxLimit and take the largest render whose growth ≤ deficit (cached per width+deficit, invalidated on demand). Growth beyond deficit breaks the loop — never borrow more than was freed.

## 4. Preview line selection

- **WHO** — users scanning large outputs in limited vertical space.
- **WHAT** — head/tail selection around an explicit `… N hidden` marker (`preview-lines.ts`).
- **WHEN** — any capped preview; behavior splits at limit ≥ 8.
- **WHERE** — `preview-lines.ts`: `selectPreviewTextLines` :24-77, ring-buffer streaming path :36-52.
- **WHY** — heads-only hides outcomes (errors live at the END of output); the 65% head / 35% tail split keeps both context and conclusion; below 8 rows a split wastes rows on the marker.
- **HOW** — head = ceil(limit×0.65), tail = max(1, remainder−1); STREAMING variant keeps the tail in a fixed ring buffer (no full materialization) and tracks total count incrementally; trailing-newline-aware counting (`countContentLines` walks char codes handling CRLF); empty-line coalescing preserves interior blanks while trimming leading runs.

## 5. Transcript sanitization

- **WHO** — anyone whose terminal renders model/tool output — this is a SECURITY surface, not cosmetics.
- **WHAT** — escape stripping, bidi defense, grapheme-safe clipping, layered secret redaction under budgets (`transcript-sanitization.ts`).
- **WHEN** — EVERY value rendered from transcripts/tool args/model text.
- **WHERE** — `terminalSafe` :15-23, `clip` :37-45, `redactInlineSecrets` :96-118, `redact` :120-166. Constants at :1-9 (500 summary / 160 encoded / 40k value / 12k string / 400 nodes).
- **WHY** — OSC/CSI escapes can rewrite terminal state; Unicode BIDI/directional marks (U+202A-E, U+2066-9, U+200E/F) can visually REORDER text to disguise commands; splitting graphemes corrupts emoji/CJK; one giant field can starve all others — hence budgets. Key-name redaction alone misses values embedded in strings, hence inline regexes.
- **HOW** — strip OSC … BEL/ST and CSI sequences, remove directional marks, map C0/C1 controls to space, normalize CR; clip by Intl.Segmenter GRAPHEMES keeping head ~75% + tail ~25% (max 1000) separated by `…\n` so both ends stay visible; redact by KEY name regex (`authorization|api[-_]?key|token|password|secret|cookie|credential|private[-_]?key`), then inline patterns (Bearer/Basic credentials, `sk-`/`pk-`/`ghp_`/`github_pat`/`xox…` prefixes, auth headers, ENV=assignments, CLI `--password=` flags, `user:pass@` URLs), plus a charset+length heuristic flagging large base64-ish blobs; recursion capped at depth 12 with node AND char budgets that degrade gracefully (`[value omitted]`, `[N entries omitted]`) rather than truncating silently mid-structure.

## 6. Status widget

- **WHO** — the user running multi-agent Fabric sessions; secondary: anyone auditing what spent tokens.
- **WHAT** — a persistent TUI widget: header (status glyph, title, call/phase progress, running counts, tokens, duration) + per-agent activity rows, nesting-indented (`widget.ts`).
- **WHEN** — visibility CONTRACT (`shouldShowFabricWidget` :73-83): `hidden` never; `always` always; `auto` = visible while ANY agent/actor is active OR run running, and AFTER completion stays visible until the user dismisses it (`snapshot.widgetDismissedAt`) — results are never yanked away the instant they land.
- **WHERE** — `widget.ts`: glyphs :7-16, coloring :18-26, activity priority :41-50, leasing :168-180, bounds :160-166, render cache :92-116.
- **WHY** — GLYPH+COLOR redundancy (✓/✗/!/■/○/· plus theme colors) survives colorblindness and monochrome terminals. ACTIVITY LINE PRIORITY (currentTool → error → result → "thinking" → status) always shows the most decision-relevant fact first. ROW LEASING (`#leasedRows = max(lease, content)` keyed by run/ambient owners) pads shrinks with blank lines so finishing agents don't collapse the layout mid-glance; the lease RESETS when the lease key changes (new run = new geometry). The overflow marker `+N` is folded into the LAST visible line's remaining width instead of spending its own row. Render caching keyed on (width, snapshot IDENTITY) with a `#pending` slot lets `hasChanged()` pre-compute the next render WITHOUT rendering twice.
- **HOW** — snapshot-driven pure render: `#buildContent` orders agents by creation (active first, then actor workers active→terminal, then terminal agents), aggregates metrics with `·` separators, indents by `nestingDepth`. All truncation is width-aware via `truncateToWidth` — never character-counted.

---

## 7. Settings system

- **WHO** — users configuring a complex multi-agent tool; secondary: agents reading config files.
- **WHAT** — a two-level TUI settings browser: root sections with one-line summaries, submenus with typed editors (`settings.ts`, 1,894 lines).
- **WHEN** — opened on demand; some sections flag that changes need a reload (`RELOAD_SECTIONS` = mesh/agents/mcp/retention).
- **WHERE** — `FabricSettingsComponent` :811-869, `coerceValue` :283-318, `parseFormattedNumericValue` :238-262, `buildFabricSettingsItems` :886+, root ids :120-134.
- **WHY** —
  - *Save scope is a first-class UI concern*: a Ctrl+G toggle switches project (`.pi/fabric.json`) vs global (`~/.pi/agent/fabric.json`), shown PERSISTENTLY in a header line with the destination file spelled out plus contextual hints ("project overrides may remain active here"; "unavailable for untrusted projects"). Silent write destinations destroy trust in settings tools.
  - *Descriptions are state-aware*: executor-memory help text DIFFERS per runtime (WASM32 limit vs V8 heap warning); fullCodeMode's description says when an ENV VAR is overriding it; the runtime option list shrinks to `[quickjs]` when Schema enforce mode requires isolation. The UI teaches consequences, not just names.
  - *Display format IS the parse contract*: every numeric renders humanly ("250k", "1.5 GB", "30s", "Off") and `parseFormattedNumericValue` parses exactly those forms back — no separate raw field, no unit drift.
  - *Custom values never disappear*: `numericOptions` unshifts the current value into the preset list when absent, so a hand-edited config value stays visible and selectable.
  - *Type-directed coercion*: `coerceValue` dispatches on the CURRENT config value's type (boolean→enum, number→formatted parse), and model pickers persist `""` meaning "inherit" so config normalization drops the override.
- **HOW** — dotted setting ids ("agents.defaultTools") map into nested config patches via `buildPartial`; root rows render live summaries (`summaryFor`: "quickjs · 60s", "pi/process"); lists paginate at 10 with search enabled; submenu layout reserves primary-column widths; theme roles (accent/muted/dim) encode selected/value/hint hierarchy.

## 8. Dashboard model (entity projection)

- **WHO** — users watching a multi-phase multi-agent run in the dashboard panes.
- **WHAT** — a pure derivation layer turning activity snapshots into ordered, grouped, DEDUPLICATED entity lists per panel (`dashboard-model.ts`, 682 lines, read in full).
- **WHEN** — every dashboard render of the activity or topology view; panels = run-activity (unphased), one per phase, plus a persistent session panel.
- **WHERE** — Entity union :15-45, group order :60-73, `entitiesFor` :157-230, represented-call suppression :186-199 & :497-509, detached-agent rescue :461-474, `withPanelProgress` :296-347, unified topology dedup :373-405, `phasePanels` :556-592.
- **WHY** —
  - *One fact, one row*: an `agents.run`/`agents.spawn` CALL and the AGENT it launched are the same event; showing both doubles noise. Calls whose subject is already represented as an entity are SUPPRESSED (`agentLaunchRefs`, actor `agents.create`).
  - *Prefix linkage tolerates id drift*: `linkedEntityId` matches ids by mutual `startsWith` because call entityIds and agent ids share prefixes but aren't guaranteed identical.
  - *No orphan entities*: agents with NO runId (detached) are rescued into panels via call linkage (:461-474) — work never silently vanishes from view.
  - *Editorial ordering beats alphabetical*: groups render in a fixed rank (Agents → Peers → Actors → Global templates → Tools → Extensions → MCP → Mesh → Tasks → Custom → State → mesh rows), stable insertion order within — the layout never jumps as entities appear.
  - *Worst-case-wins status*: panel status derives from children with priority failed > blocked > running > completed, EXCEPT the session panel which uses simpler failed/running/idle — aggregate semantics should match what the panel means, not one formula for all.
  - *Honest elapsed time*: min(start)→max(finish), pinned to `now` while anything is active — never shows a frozen duration on a live panel.
- **HOW** — activity bucketed per phase key (unphased = `__fabric_unphased`); progress projected ONCE per panel into a map then reused; empty run-activity panels are omitted, the session panel is ALWAYS present (no blank dashboards); the topology view merges canonical entities (main/agents/actors/peers) with mesh projections through seen-sets, collapsing mesh participants that RESOLVED into real agents.

## 9. Topology view (tree + selection-anchored windows)

- **WHO** — users watching agent trees (nesting by parentId) and project mesh participants/topics/routes.
- **WHAT** — rows-first graph rendering: flatten agent trees under phase headers, then WINDOW them around the selection with TYPED omission rows (`topology.ts`, 972 lines, key ranges full).
- **WHEN** — run topology per run; mesh topology built from events when participants exist.
- **WHERE** — `flattenGroup` :118-165, `windowRunTopologyRows` :283-340, omission :196-215, `structuralContext` :217-248, unknown-phase grouping :85-105, mesh route status :516-520.
- **WHY** —
  - *Trees must survive cycles and orphans*: DFS marks visited (cycle guard); any agent left unvisited after root walks is appended as its own root (:160-164) — a malformed parent link HIDES nothing.
  - *Connectors travel with the row*: each agent row carries `ancestorLast[]` booleans and the ancestor ENTITY-ID chain, so the renderer draws correct └─/├─ guides AND knows the lineage without re-walking.
  - *Omitted content is summarized, not erased*: omission rows carry direction (before/after/both) PLUS aggregates — total rows, agents, phases, active/blocked/failed counts — so collapsing 500 rows still answers "is anything wrong down there?"
  - *Off-screen ancestors of the SELECTION are named* (:217-248): if the selected agent's parent chain or phase header scrolled out, up to 3 ancestor NAMES + the phase name ride along as structural context. You always know WHERE in the tree you are.
  - *Windowing is a fixpoint*: summary-row count changes available content slots, so start/end re-converge over ≤4 iterations instead of being computed once wrong.
  - *Schema drift can't lose work*: agents referencing UNKNOWN phase ids get their own group named by that id (:99-104).
  - *Route status from event vocabulary*: failure words (error/failed/blocked/reject…) detected by splitting kind names on separators; lifecycle/compact/ack topics filtered as noise.
- **HOW** — flow groups = unphased bucket first (only if non-empty), known phases (skipping empties unless asked), then unknown-id groups; empty-everything collapses to a single "Run activity" row. Mesh model joins actors/agents/main by id AND name maps, deduplicates participants that resolved into real agents, and separates SYSTEM_TOPICS from subscriber topics.

## 10. Syntax highlighting (background budget)

- **WHO** — users reading code previews inside tool renders.
- **WHAT** — Shiki-powered highlighting with lazily loaded grammars, time-sliced background tokenization, and bounded caches (`highlight.ts`, 854 lines; header + structure read).
- **WHEN** — code previews render; heavy full-file tokenization happens OFF the render path in slices.
- **WHERE** — budget constants :11-38 (each with its measurement comment), alias maps :52-135, theme/luminance machinery :139-290.
- **WHY** —
  - *Startup cost is measured and dodged*: light shiki subpaths cost ~5ms (catalog only); full `createHighlighter` ~50ms — so the heavy import is DYNAMIC, inside `initHighlighting`, keeping extension startup off the shiki graph entirely.
  - *Every slice is frame-safe*: one background slice = 96 lines / 16k chars ≈ 5-10ms of Shiki work on heavy grammars (a 1.3k-line TS file measured ~106ms) — "keeping each event-loop tick well under one frame." Files over 200k chars never enter full-file tokenization at all.
  - *Memory is bounded twice*: render cache limited to 192 entries AND 4M chars; highlight entries capped at 24 / 4M chars. All limits env-overridable (`CODE_PREVIEW_MAX_HIGHLIGHT_CHARS`, `CODE_PREVIEW_FILE_HIGHLIGHT_MAX_CHARS`).
  - *Language detection is layered*: exact basenames (Dockerfile/Makefile/lockfiles) → extension map → alias normalization (sh/zsh→bash, ts→typescript), with 10 common languages PRELOADED so the first render doesn't stall on grammar fetch.
  - *Contrast is computed, not assumed*: ANSI-256 → RGB conversion plus relative-luminance classification picks light/dark Shiki variants and falls back to a fixed low-contrast gray when the theme can't answer — unreadable tokens are treated as a bug.
- **HOW** — pending-language sets with load callbacks coordinate async grammar loads; `GrammarState` threads through slices so split tokenization stays correct across chunk boundaries; escape-control-char pass guards terminal output before coloring.

## Porting checklist

1. Confidence-gate any generated emphasis; drop rather than risk wrong highlights.
2. Noise-filter emphasis against opposite-side signal.
3. Phase-lock animations to wall clock; unref timers.
4. Measure freed rows and lend them to neighbors; never let layouts jump.
5. Previews: head/tail with explicit omitted-count markers; ring buffers when streaming.
6. Treat ALL rendered foreign text as hostile: escapes, bidi, graphemes, secrets, budgets.
7. Widgets: glyph+color redundancy, activity-priority lines, row leasing, dismiss-until contracts, identity-keyed render caches.
