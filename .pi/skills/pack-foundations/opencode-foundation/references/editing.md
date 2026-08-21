# OpenCode — Editing Subsystem Reference

Complete source-grounded reference for model-driven file editing. Files: `packages/opencode/src/tool/edit.ts` (737 lines) and `patch/index.ts` (686 lines), both read in full. Design lineage is credited in-file: "the approaches in this edit tool are sourced from" cline's diff-apply and gemini-cli's editCorrector.

## The replacer chain: nine fallbacks behind one replace()

`replace(content, oldString, newString, replaceAll)` iterates an ordered list of Replacer GENERATORS (:217, :692-702): SimpleReplacer (exact), LineTrimmedReplacer, BlockAnchorReplacer, WhitespaceNormalizedReplacer, IndentationFlexibleReplacer, EscapeNormalizedReplacer, TrimmedBoundaryReplacer, ContextAwareReplacer, MultiOccurrenceReplacer. Each yields candidate match spans; the first replacer producing a USABLE, UNIQUE span wins. Exact matches always win before any fuzzy heuristic gets a chance.

Notable mechanics:

- **LineTrimmedReplacer** compares trim()-ed lines but yields the ORIGINAL untrimmed span by recomputing character offsets from line lengths (:266-286) — replacement never corrupts untouched bytes.
- **BlockAnchorReplacer** requires ≥3 search lines, anchors on trimmed first/last lines, bounds block-size drift to `max(1, floor(searchBlockSize * 0.25))` (:309), and scores middle lines by Levenshtein similarity against a 0.65 threshold for both single-candidate early-exit and multi-candidate best-match (:338-404).
- **EscapeNormalizedReplacer** unescapes the literal `\n`, `\t`, quote/backtick sequences models over-escape (:503-527).
- Uniqueness is enforced by comparing first indexOf vs lastIndexOf of each yielded span (:715-717); a NON-unique candidate silently demotes to the next replacer rather than failing — a fuzzy match occurring twice doesn't kill an edit a stricter replacer could have made unique.

Only when NO replacer found anything does it throw not-found; candidates-found-but-none-unique throws multiple-matches.

**Lesson:** model-supplied edits survive best as an ordered generator pipeline — exact first, then increasingly tolerant matchers, each yielding original-text spans so replacement never corrupts untouched bytes.

**Probe:** an indented or CRLF find still succeeds via LineTrimmed/EscapeNormalized replacers; a 3+-line find differing slightly succeeds only at ≥0.65 similarity; a twice-occurring oldString without replaceAll throws exactly "Found multiple matches…".

## Collision triad: asymmetric spans, ambiguity refusal, instructing errors

Three failure modes with bespoke, action-instructing messages:

1. Identical old/new rejected up front — checked at BOTH the tool layer (:74-76) and inside replace() itself (:683-685), keeping the pure function safe standalone.
2. **Disproportionate-span guard** (:731-735): fuzzy replacers can yield spans far larger than requested (a 3-line anchor expanding to 40 lines would destroy unrelated code). Two heuristics: line-count blowup (`searchLines >= max(oldLines+3, oldLines*2)`) and byte blowup for multi-line finds (`> max(old+500, old*4)`), single-line finds exempted from bytes. Refusal message verbatim: "Refusing replacement because the matched span is much larger than oldString. Re-read the file and provide the full exact oldString."
3. Ambiguity/not-found errors that TEACH: "Found multiple matches for oldString. Provide more surrounding context to make the match unique." / "Could not find oldString in the file. It must match exactly, including whitespace, indentation, and line endings." Empty oldString on an existing file routes to the write tool explicitly: "Provide the exact text to replace, or use write for an intentional full-file replacement."

**Lesson:** guard fuzzy matching with asymmetric-span rejection and route every failure back to the model as an instruction ('re-read', 'add context', 'use write') — turning errors into self-correction prompts rather than dead ends.

**Probe:** isDisproportionateMatch true for 10-line search vs 2-line old, false for ANY single-line pair regardless of length; double-occurrence oldString throws while replaceAll=true replaces both.

## The edit transaction: locks, encoding preservation, formatter re-sync, LSP feedback

The whole read-modify-write cycle runs under a per-resolved-path Semaphore(1) (:35-41, :88) — parallel agent tasks can't race read→write. Guards run inside the lock (missing file, directory). Encoding is preserved through the edit: line ending detected as CRLF-or-LF (:15-17), both params normalized then converted BACK to the file's ending (:128-131); BOM follows `desiredBom = source.bom || next.bom` (:133).

The permission gate shows a diff computed BEFORE the write (:136-146), then RE-COMPUTED after formatting (:154-161) — because formatters mutate the file post-write, the tool re-reads so returned diffs reflect reality. LSP diagnostics close the loop in the same turn: output appends "LSP errors detected in this file, please fix:\n{block}" (:196-202). Events publish FileSystem.Edited + Watcher.Updated ('add' vs 'change'). Domain errors pipe through Effect.orDie so they become defects rather than swallowable typed failures.

**Lesson:** treat an edit as a locked transaction preserving file encoding (BOM/EOL), gating on a pre-computed diff, re-syncing after formatters, and feeding LSP diagnostics straight into the model's output channel.

**Probe:** CRLF+BOM file edited with LF-only oldString keeps CRLF + original BOM; a Format handler mutating content must be reflected in the emitted filediff; two simultaneous edits serialize without lost updates.

## The V4A patch parser: markers, heredocs, tolerance

`parsePatch` (:186-232) extracts content between `*** Begin Patch` / `*** End Patch` and parses three hunk kinds — Add File, Delete File, Update File (with optional `*** Move to:` renames). Markers fail HARD and early: "Invalid patch format: missing Begin/End markers", plus ordering (`beginIdx >= endIdx` rejected).

Models wrap patches in shell heredocs, so `stripHeredoc` runs FIRST on the whole input (:177-187) — a deliberate regex shortcut matching `cat <<'EOF' … EOF`. Chunk grammar is lenient: `@@` opens a chunk with optional change_context; space-prefixed lines go to BOTH old and new, `-` only old, `+` only new; the literal `*** End of File` terminates; unknown non-marker lines are SKIPPED rather than erroring — tolerant of stray prose between hunks.

**Lesson:** accept model-emitted patch formats defensively — hard-fail only on missing structural markers, skip unrecognized noise, unwrap shell heredoc conventions before parsing.

**Probe:** missing either marker throws the exact message; mixed context/-/+ chunks split correctly; heredoc-wrapped patches parse identically to bare ones.

## The applier: four-pass seeking with reverse-order splices

Update chunks locate their target via `seekSequence`'s escalating comparators (:460-487): exact → rstrip → full trim → Unicode-normalized trim. That last pass maps curly quotes, em-dashes, ellipses, and NBSP to ASCII (:411-417) — smart punctuation from models must match plain files. A per-chunk `change_context` steers the search forward, `*** End of File` pins to EOF, and forward progress is enforced (`lineIndex = found + pattern.length`) so successive chunks can't re-match earlier regions.

Failures carry the missed lines back verbatim: `Failed to find expected lines in ${filePath}:\n${old_lines.join(...)}` (:388). Pure insertions append at trailing-newline boundaries; a failed match retries once after dropping a trailing empty line from both sides (:375). Collected replacements sort ASCENDING then apply in REVERSE (:391-411) — "Apply replacements in reverse order to avoid index shifting."

**Lesson:** locate hunks with staged comparator relaxation, advance a cursor for deterministic multi-chunk order, and apply index-based splices in reverse so earlier edits never invalidate later offsets.

**Probe:** rstrip pass resolves trailing-whitespace drift at index 0; curly-quote patterns match only at Pass 4; disjoint-region chunks splice correctly despite line-count shifts; absent old_lines throw the exact expected-lines message.

## Verified-parse-before-mutation: three outcomes, dry-run everything

`maybeParseApplyPatchVerified` (:569-686) separates three outcomes BEFORE touching disk:

1. **PatchParseError** — malformed patch text (no throw);
2. **CorrectnessError** — parses fine but fails against current file state (missing context lines, unreadable delete target: "Failed to read file for deletion: …");
3. **ImplicitInvocation** — the model emitted a RAW PATCH without invoking the tool (detected by parsing a lone argv element), letting the harness coach it to call apply_patch explicitly.

Every hunk DRY-RUNS (read files, derive new contents) building a changes map keyed on MOVE destinations when present — mirroring codex-rs apply-patch safety design: nothing is written until the entire patch is proven computable. Empty patches refuse: "No files were modified." One cosmetic weakness is admitted inline: generateUnifiedDiff emits a naive `@@ -1 +1 @@` header — "in a real implementation you'd use a proper diff algorithm" (:490).

**Lesson:** separate parse-detection, correctness dry-run, and filesystem application into distinct phases so a patch is either fully validated — or precisely diagnosed, including "you forgot to call apply_patch" — before the first byte changes.

**Probe:** malformed patch → PatchParseError without throwing; bare raw patch → CorrectnessError(ImplicitInvocation); update hunk with absent old_lines → CorrectnessError, never a write; applyHunksToFiles([]) fails "No files were modified."
