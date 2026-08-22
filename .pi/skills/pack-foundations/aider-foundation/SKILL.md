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
- Provider policy + recovery -> exact model settings, generic fallback, deep override merge, and capped retry backoff (`references/model-policy.md`).
- Scoped change safety -> staged+unstaged dirty detection, pre-edit baseline snapshots, and edited-path-only commits (`references/git-safety.md`).
- Context orchestration -> fixed prompt chunk ordering, active-vs-archived turns, and tail-preserving recursive summarization (`references/context-orchestration.md`).
- Terminal UX -> delayed spinner with probed unicode support, streaming markdown with no-inset code blocks.

## Capsule map

### Token-bounded context
- **Symbol:** `RepoMap.get_ranked_tags()` in `aider/repomap.py`.
- **Flow:** tree-sitter tags -> weighted graph -> personalized PageRank -> ranked definitions, rendered to the token budget.
- **Invariant:** conversation files steer rank but are never emitted.
- **Probe:** mention a file/ident, assert its definitions rise while the chat file stays absent.
- **Retrieve:** `search_graph({ project: "aider", query: "RepoMap" })`; load `references/repomap.md`.

### Repairable edit application
- **Symbol:** `replace_most_similar_chunk()` / `EditBlockCoder.apply_edits()` in `aider/coders/editblock_coder.py`.
- **Flow:** `(path, SEARCH, REPLACE)` accept exact/uniform-indent/leading-blank/elision forms; an unmatched block raises a repair prompt with current text.
- **Invariant:** nearest-edit-distance code is unreachable after an unconditional `return`; never silently fuzzy-apply.
- **Probe:** a near miss yields no replacement; an indent-only mismatch preserves surrounding indent.
- **Retrieve:** `load references/edit-formats.md`.

### Bounded collaboration loops
- **Symbol:** `Coder.run_one()` in `aider/coders/base_coder.py`; `FileWatcher.get_ai_comments()` in `aider/watch.py`.
- **Flow:** a reflected lint/edit message becomes the next model input until `max_reflections`; watched comments classify `ai!` change vs `ai?` question.
- **Invariant:** loop termination is explicit; watcher input preserves the author's comment text.
- **Probe:** at the reflection cap, assert no extra send; classify `// ai? explain` as a question.
- **Retrieve:** `mcp.codebase_memory_search_graph({ project: "aider", query: "run_one reflected_message get_ai_comments" })`; load `references/collab.md`.

### Provider policy and bounded recovery
- **Symbol:** `Model.configure_model_settings()` / `Model.send_completion()` in `aider/models.py`.
- **Flow:** exact model settings first, generic fallback, `aider/extra_params` deep merge; retry consults an exception table and doubles delay to a 60s cap.
- **Invariant:** an exact declaration beats generic; non-retryable or >60s stops rather than looping forever.
- **Probe:** exact-name policy beats generic; a rate-limit error retries with backoff, a hard error does not.
- **Retrieve:** `load references/model-policy.md`.

### Scoped change safety
- **Symbol:** `GitRepo.get_dirty_files()` / `GitRepo.commit()` in `aider/repo.py`; `check_for_dirty_commit`, `auto_commit` in `aider/coders/base_coder.py`.
- **Flow:** staged+unstaged union detects dirt; a pre-edit snapshot commits only the allowed dirty baseline; post-edit commit scopes to edited paths.
- **Invariant:** an auto-commit never sweeps unrelated dirty files; author/committer env is restored even on failure.
- **Probe:** editing a dirty file yields a baseline snapshot commit + one scoped edit commit; unrelated dirty files stay untouched.
- **Retrieve:** load `references/git-safety.md`.

### Context assembly and compression
- **Symbol:** `ChatChunks.all_messages()` in `aider/coders/chat_chunks.py`; `ChatSummary.summarize()` in `aider/history.py`.
- **Flow:** ordered chunks assemble with `cur` last; when history exceeds budget, preserve a recent tail, summarize the head, recurse at most three levels.
- **Invariant:** summary boundaries end on an assistant message; the active turn stays after archived context.
- **Probe:** over-budget history yields a bounded prompt whose tail keeps the most recent assistant turn.
- **Retrieve:** load `references/context-orchestration.md`.

### Terminal UX
- **Symbol:** `InputOutput.confirm_ask()` and `restore_multiline` in `aider/io.py`.
- **Flow:** group confirmations with shared preference, never-prompts keyed by question, and nested-prompt multiline restoration.
- **Invariant:** `explicit_yes_required` defeats blanket yes; nested prompts cannot leak a changed multiline mode.
- **Probe:** `test_confirm_ask_with_group`, `test_multiline_mode_restored_after_interrupt` in `tests/basic/test_io.py`.
- **Retrieve:** load `references/ux.md`.

## Extending the foundation
1. Choose one uncovered porting seam, prewalk it + its direct test with Codebase Memory.
2. Add a map entry with Symbol, Flow, Invariant, Probe, and Retrieve; put detailed source notes in the matching reference.
3. Record module coverage and open gaps in the work record, then run `node scripts/check.mjs`.

## Full view (memory graph)

Indexed in Codebase Memory as **`aider`** (`/mnt/hdd/utopia/inspo/aider`) at `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`: **full** index, 7,507 nodes / 19,923 edges, 0 skipped files. Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "aider", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })`
- `codebase_memory_search_graph({ project: "aider", query: "<symbol>" })`
- `codebase_memory_trace_path({ project: "aider" })`
- `codebase_memory_check_index_coverage({ project: "aider", paths: [...] })`

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/repomap.md` — PageRank ranking, personalization, budget fitting, cache.
- `references/edit-formats.md` — SEARCH/REPLACE ladder, elision, disabled fuzzy path, failure loop.
- `references/collab.md` — watch mode, lint reflection, commit-per-edit, streaming markdown.
- `references/ux.md` — human I/O: group confirmations, never-prompts, interrupt preservation.
- `references/model-policy.md` — exact model settings, override precedence, request construction, bounded recovery.
- `references/git-safety.md` — dirty baselines, scoped commits, attribution boundaries.
- `references/context-orchestration.md` — ordered prompt chunks and tail-preserving summaries.

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