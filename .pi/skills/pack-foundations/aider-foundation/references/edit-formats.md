<!-- capsule-v2 -->
# SEARCH/REPLACE — forgiving block matcher, loud failure loop, never silent fuzzy-apply

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a pair-programming harness apply model-authored SEARCH/REPLACE blocks without corrupting the file on a near-miss edit?

## Path/Symbol
`aider/coders/editblock_coder.py`: `replace_most_similar_chunk(whole, part, replace)` (:157), `EditBlockCoder.apply_edits(edits, dry_run=False)` (:41), `do_replace(fname, content, before_text, after_text, fence)` (:364), `replace_closest_edit_distance` (:296), `try_dotdotdots(whole, part, replace)` (:190).

## Signature & Data Shape
Edits are `(path, original, updated)` triples parsed from fenced `<<<<<<< SEARCH / ======= / >>>>>>> REPLACE` blocks. `apply_edits` returns `None` when every block matches, or raises `ValueError` carrying a single structured repair prompt.

## Decisive source — the fuzzy fallback is deliberately unreachable
Exact, uniform-indent, dropped-blank, then paired-elision matching each return before the fuzzy path (:166-180):
```python
    res = perfect_or_whitespace(whole_lines, part_lines, replace_lines)
    if res:
        return res
    # drop leading empty line, GPT sometimes adds them spuriously (issue #25)
    if len(part_lines) > 2 and not part_lines[0].strip():
        res = perfect_or_whitespace(whole_lines, part_lines[1:], replace_lines)
        if res:
            return res
    try:
        res = try_dotdotdots(whole, part, replace)
        if res:
            return res
    except ValueError:
        pass

    return  # <-- replace_closest_edit_distance below is DEAD CODE
    res = replace_closest_edit_distance(whole_lines, part, part_lines, replace_lines)
    if res:
        return res
```
The unconditional `return` before the fuzzy matcher is the product decision: a near miss must never silently edit the wrong lines. Fail the retry can carry the file`s true text.

## Decisive source — the failure loop returns exact context (:73-111)
```python
res = f"# {len(failed)} SEARCH/REPLACE {blocks} failed to match!\n"
for edit in failed:
    path, original, updated = edit
    content = self.io.read_text(self.abs_root_path(path))
    res += f"\n## SearchReplaceNoExactMatch: This SEARCH block failed to exactly match lines in {path}\n<<"
        + ">>>>>> SEARCH\n{original}=======\n{updated}>>>>>>> REPLACE\n\n"
    did_you_mean = find_similar_lines(original, content)
    if did_you_mean:
        res += f"Did you mean to match some of these actual lines from {path}?\n{self.fence[0]}\n{did_you_mean}\n{self.fence[1]}\n"
    if updated in content and updated:
        res += f"Are you sure you need this SEARCH/REPLACE block? The REPLACE lines are already in {path}!\n"
```
The failure message embeds the true current lines (fenced for copy), the searched block, a did-you-mean hint, and a double-apply warning when the REPLACE text already exists. Already-passed blocks are appended so the model does not re-send them.

## Flow
`apply_edits` iterates triples; `do_repleac` matches per path. On a no-match with a non-empty original it retries the same block against every other file in chat (issue #2258, :50-58). Passing edits are written immediately; failed edits accumulate and a single `ValueError` returns both failures and successes to constrain the retry.

## Invariant
- `replace_closest_edit_distance` sits below an unconditional `return`, so it can never run — near misses always surface as repair feedback, never a guessed apply.
- The failure reply preserves the file`s real text so the retry can match exactly.
- A REPLACE already present in the file triggers the `Are you sure` double-apply guard; passed edits are excluded from the resend set.

## Probe (direct test)
`tests/basic/test_editblock.py`: `test_replace_part_with_missing_varied_leading_whitespace` (:240) proves uniform-indent recovery; `test_replace_part_with_missing_leading_whitespace_including_blank_line` (:309) proves dropped-blank + indent; `test_replace_multiple_matches` (:278) proves first-match-only. A non-matching block yields no fuzzy replacement. Run `python -m pytest tests/basic/test_editblock.py -k "whitespace or multiple_matches"`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "replace_most_similar_chunk apply_edits do_replace", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the strict-match-plus-smart-retry contract; port the matching ladder and failure loop as-is and keep any fuzzy matcher behind a disabled, non-default flag.
