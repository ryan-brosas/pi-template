# Aider — Edit Formats Reference

Related files in the same family: `aider/coders/wholefile_coder.py`, `aider/coders/udiff_coder.py`, `aider/coders/patch_coder.py`, dispatched via `aider/coders/base_coder.py`.

Source-grounded reference. Read in full: `aider/coders/search_replace.py` (757 lines, including `RelativeIndenter`, `dmp_lines_apply`, and the git cherry-pick strategies), `aider/coders/editblock_coder.py` key ranges (:15-130, :160-295). Anchors: HEAD/DIVIDER/UPDATED regexes at `aider/coders/editblock_coder.py:386-392` with 5-9 marker tolerance.

## WHAT: SEARCH/REPLACE blocks with a forgiving matcher and a LOUD failure loop

The `diff` edit format asks the model for fenced blocks:

```
<<<<<<< SEARCH
...exact existing lines...
=======
...replacement...
>>>>>>> REPLACE
```

Headers tolerate 5-9 marker chars and optional trailing labels (:386-388) because models pad them inconsistently.

## WHERE: the matching ladder (`do_replace`, editblock_coder.py:158-206)

1. **perfect_or_whitespace** — exact match, then UNIFORM leading-whitespace mismatch: if all SEARCH lines differ from the file only by the same indentation offset, re-indent REPLACE by that offset and apply (:249-289). Models systematically drop or add uniform indent.
2. **Leading empty line dropped** — GPT adds one spuriously (issue #25 referenced, :168-174).
3. **try_dotdotdots** (:178-207) — elided `...` chunks must PAIR exactly between SEARCH and REPLACE; each concrete chunk must match uniquely (count==1) or it raises; empty-part + replace appends. Elision handled WITHOUT guessing.
4. **Fuzzy closest-match is DEAD CODE** (:205-211): `return` precedes `replace_closest_edit_distance`. This is the design lesson — aider REFUSES to guess applies. A near-miss edit silently corrupting the wrong lines is worse than a retry round-trip.

For divergent blocks, `search_replace.py` offers opt-in flexible strategies (dmp_lines_apply diff-match-patch at LINE granularity with Match_Threshold 0.1; RelativeIndenter rewriting leading whitespace to RELATIVE deltas with a unicode outdent marker chosen to not exist in the texts) — used by patch coder paths, never as silent fallback here.

## WHY the failure loop is the real feature (`apply_edits` :44-121)

Failed edits raise ValueError carrying a STRUCTURED repair prompt:

- Each failure echoes the exact block + `SearchReplaceNoExactMatch` header
- `find_similar_lines(original, content)` suggests "Did you mean to match some of these actual lines?" — the model gets the TRUE current text fenced, ready to copy
- If the REPLACE content already EXISTS in the file: "Are you sure you need this block?" — catches double-apply
- Passed blocks are listed with "Don't re-send them. Just reply with fixed versions of the blocks above" — prevents destructive re-application of succeeded edits
- Failed edits ALSO retry against OTHER FILES IN CHAT before giving up (:60-68, issue #2258) — models misattribute target files

Shell commands (`None`-path edits) are extracted SEPARATELY from file edits (:30-34) so ```bash blocks inside responses execute without being treated as broken patches.

## Verification

`tests/basic/test_editblock.py` and the `search_replace` fixture harness (`proc()` runs every strategy over search/replace/original fixture directories) pin the ladder; fuzzy applies stay behind the dead-code return. Shell commands (`None`-path edits) extract as `shell_commands` via `aider/coders/editblock_coder.py:30-34`; failing SEARCH blocks echo through `SearchReplaceNoExactMatch` with fuzzy hints from `find_similar_lines`. The ladder lives between `do_replace` and the disabled `replace_closest_edit_distance` (`aider/coders/search_replace.py`). Flexible strategies (`dmp_lines_apply`, `RelativeIndenter` in `aider/coders/search_replace.py`, `git_cherry_pick_osr_onto_o`) serve `patch_coder` paths only. Fixture harness: `search_replace.py` `proc()` under `tests/fixtures` runs all strategies.

## The lessons
1. Make the format STRICT (exact match) and the RETRY SMART (echo true text, suggest did-you-mean, detect already-applied, scope the resend).
2. Never silently fuzzy-apply edits; return failures to the model with everything needed to fix them in one round-trip.
3. Normalize the model's KNOWN tics in the parser (marker padding, uniform indent loss, spurious blank lines, elision dots) — but only the ones observed and issue-tracked.

## The sibling formats

The SEARCH/REPLACE format is one of a family dispatched from a shared coder base: `aider/coders/wholefile_coder.py` (full-file rewrite), `aider/coders/udiff_coder.py` (unified diff), and `aider/coders/patch_coder.py` (raw patch application using the flexible ladder in `aider/coders/search_replace.py`). All four share the failure-feedback discipline documented above.

## Capsule evidence (current source)
- **Path/Symbol:** `aider/coders/editblock_coder.py` — `replace_most_similar_chunk(whole, part, replace)`, `EditBlockCoder.apply_edits(edits, dry_run=False)`.
- **Flow:** exact/whitespace, dropped-leading-blank, and paired-elision strategies precede an unconditional `return`; failed blocks get a structured repair message and a nearest-text hint.
- **Invariant:** `replace_closest_edit_distance` remains below that `return`, so it cannot silently apply a fuzzy edit.
- **Probe:** `tests/basic/test_editblock.py` covers indentation recovery, a spurious blank line, and first-match behavior.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "replace_most_similar_chunk apply_edits"})`.

---

<!-- capsule-v1 -->

## Retrieval capsule

- **Path/Symbol:** `aider/coders/editblock_coder.py` — `replace_most_similar_chunk(whole, part, replace)` / `EditBlockCoder.apply_edits(edits, dry_run=False)`.
- **Signature:** a file body plus SEARCH/REPLACE chunks yields replacement text or a structured edit failure.
- **Data Shape:** each edit carries `(path, search, replace)`; failures retain the original block and a nearest-text hint for the model's next turn.
- **Flow:** exact/indent/leading-blank/paired-elision matching runs before a deliberately unreachable closest-edit-distance branch; failures become repair feedback.
- **Invariant:** a near miss can never silently fuzzy-apply to a guessed location.
- **Probe:** indentation recovery, a spurious blank line, first-match behaviour; see `tests/basic/test_editblock.py`.
- **Retrieve:** inspect `aider/coders/editblock_coder.py:44-121,158-211`.
