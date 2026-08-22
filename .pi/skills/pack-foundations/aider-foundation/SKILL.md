---
name: aider-foundation
description: "Use when building AI pair-programming harnesses: repo maps (PageRank-ranked tree-sitter outlines), forgiving SEARCH/REPLACE matching with loud failure loops, watch-mode AI comments, lint-reflection cycles, and commit-per-edit discipline."
disable-model-invocation: true
---

# Aider Foundation

## Solves
How a terminal AI pair-programmer works end to end: showing an LLM a whole repository inside a token budget, applying model-authored edits safely, and closing every failure loop back through the model.

## When to use
Building AI coding agents, repo-map-style context selection, structured edit formats, editor-integration workflows, or self-correcting edit pipelines.

## Key skill-lines
- Whole-repo context under a token budget -> the repo map: tree-sitter tags -> personalized PageRank -> binary-search fitting (`references/repomap.md`).
- Model-authored edits -> SEARCH/REPLACE blocks with a forgiving matcher and a LOUD failure loop; fuzzy-apply deliberately disabled (`references/edit-formats.md`).
- Self-correction -> reflected messages: edit failures AND lint errors become the model's next user message, capped by max_reflections (`references/collab.md`).
- Editor-first workflow -> watch mode: `// ai!` / `# ai?` comments in any file become chat requests; files auto-added.
- Reviewability -> commit-per-edit with a WEAK model writing commit messages from diffs.
- Terminal UX -> delayed spinner with probed unicode support, streaming markdown with no-inset code blocks.

## Capsule map

### Token-bounded context
- **Path/Symbol:** `aider/repomap.py` — `RepoMap.get_ranked_tags(chat_fnames, other_fnames, mentioned_fnames, mentioned_idents, progress=None)`.
- **Flow:** tree-sitter tags → weighted MultiDiGraph → personalized PageRank → ranked definitions; rendering fits the token budget.
- **Invariant:** conversation files steer rank but are excluded from emitted map text.
- **Probe:** mention a file/identifier and assert its connected definitions rise while the chat file itself is absent.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "RepoMap get_ranked_tags"})`; load `references/repomap.md`.

### Repairable edit application
- **Path/Symbol:** `aider/coders/editblock_coder.py` — `replace_most_similar_chunk(whole, part, replace)` and `EditBlockCoder.apply_edits(edits, dry_run=False)`.
- **Data/Flow:** `(path, SEARCH, REPLACE)` blocks accept exact/uniform-indent/leading-blank/elision forms; an unmatched block raises a repair prompt containing current text and passed-block state.
- **Invariant:** nearest-edit-distance code is unreachable after an unconditional `return`; do not silently fuzzy-apply.
- **Probe:** a near miss returns no replacement; an indentation-only mismatch preserves the file's indentation.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "replace_most_similar_chunk apply_edits"})`; load `references/edit-formats.md`.

### Bounded collaboration loops
- **Path/Symbol:** `aider/coders/base_coder.py` — `Coder.run_one(user_message, preproc)`; `aider/watch.py` — `FileWatcher.get_ai_comments(filepath)`.
- **Flow:** a reflected lint/edit message becomes the next model input until `max_reflections`; watched comments classify `ai!` as change and `ai?` as question.
- **Invariant:** loop termination is explicit, and watcher input preserves the author's comment text.
- **Probe:** set a reflection at the cap and assert no extra send; classify `// ai? explain` as question.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "run_one reflected_message get_ai_comments"})`; load `references/collab.md`.

## Extending the foundation
1. Choose one uncovered porting seam, then prewalk it and its direct test with Codebase Memory.
2. Add a map entry with Path/Symbol, Flow, Invariant, Probe, and Retrieve; put detailed source notes in the matching reference.
3. Record module coverage and open gaps in the work record, then run `node scripts/check.mjs`.

## Full view (memory graph)

Indexed in Codebase Memory as **`aider`** (`/mnt/hdd/utopia/inspo/aider`, branch default). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "aider", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "aider", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "aider", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "aider", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/repomap.md` — PageRank ranking heuristics, personalization, budget binary search, cache policies.
- `references/edit-formats.md` — SEARCH/REPLACE ladder, elision handling, the disabled fuzzy path, the structured failure loop.
- `references/collab.md` — watch mode, lint reflection, commit-per-edit, spinner, streaming markdown (5W1H).
- `references/ux.md` — the human I/O layer: group-scoped confirmations, never-prompts, deferred bells, multiline protocols, interrupt preservation, output conventions.

## Skill Result Contract

```xml
<skill_result>
  <skill>aider-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported, provenance cited, verified</evidence>
  <artifacts>Ported primitive + path</artifacts>
  <risks>Silent misapplied edits, unbounded reflection loops, token-budget overrun, or none</risks>
</skill_result>
```