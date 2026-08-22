# Aider — Scoped Git safety

<!-- capsule-v1 -->

Source-grounded reference; walk the Git wrapper and its tests in full before porting the safety contracts.

## Dirty baselines and scoped agent commits

- **Path/Symbol:** `aider/repo.py` — `GitRepo.get_dirty_files()`, `GitRepo.is_dirty(path=None)`, `GitRepo.commit(fnames=None, context=None, message=None, aider_edits=False, coder=None)`; `aider/coders/base_coder.py` — `check_for_dirty_commit`, `dirty_commit`, `auto_commit`.
- **Signature:** dirty discovery returns a staged/unstaged filename union; commit returns `(short_hash, message)` or `None` and may be scoped to a filename list.
- **Data Shape:** a pre-edit path set becomes the dirty snapshot; the edited-file set becomes the post-edit commit scope; attribution flags are tri-state.
- **Flow:** inspect both index and worktree dirt; when an allowed file is already dirty, snapshot only that baseline before edit. After the edit, form the commit from only the edited paths; message generation sees the same scoped diff.
- **Invariant:** staged and unstaged files both count as dirty; an auto-commit never sweeps unrelated dirty files into the agent change; temporary author/committer env is restored even if commit fails.
- **Probe:** `tests/basic/test_coder.py::test_gpt_edit_to_dirty_file` and `test_only_commit_gpt_edited_file`; attribution cases in `tests/basic/test_repo.py`.
- **Retrieve:** `mcp.codebase_memory.search_graph({project:"aider",query:"GitRepo get_dirty_files commit dirty_commit auto_commit"})`; inspect `aider/repo.py:131-318,581-602` and `aider/coders/base_coder.py:2175-2423`.

## Porting verdict

**Adopt** staged-plus-unstaged dirty detection and scoped-baseline preservation. **Adapt** commit mechanics behind an explicit user gate — Pi must not auto-commit or change Git identity by default.