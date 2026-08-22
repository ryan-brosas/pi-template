<!-- capsule-v2 -->
# Scoped Git safety — dirty baselines and edited-path-only commits

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a harness auto-commit model edits without ever sweeping the user's unrelated dirty files into an AI change?

## Path/Symbol
`aider/repo.py`: `GitRepo.get_dirty_files()` (:581) and `is_dirty(path)` (:598); `GitRepo.commit(fnames=None, context=None, message=None, aider_edits=False, coder=None)` (:131). `aider/coders/base_coder.py`: `auto_commit(edited, context=)` (:2375), `dirty_commit()` (:2411), `check_for_dirty_commit(path)` (:2175).

## Signature & Data Shape
`get_dirty_files()` returns the union of staged and unstaged filenames. `auto_commit(edited)` commits exactly the `edited` path set. `check_for_dirty_commit` records whether the pre-edit baseline was already dirty (`need_commit_before_edits`) so a baseline snapshot commit precedes the scoped AI edit commit.

## Decisive source — dirty union (staged AND unstaged) (:590-596)
```python
def get_dirty_files(self):
    dirty_files = set()
    staged_files = self.repo.git.diff("--name-only", "--cached").splitlines()
    dirty_files.update(staged_files)
    unstaged_files = self.repo.git.diff("--name-only").splitlines()
    dirty_files.update(unstaged_files)
    return list(dirty_files)
```
Both stages count as dirty — a file staged by the human is never silently treated as clean.

## Decisive source — scope the commit to edited paths only (:2375-2404)
```python
def auto_commit(self, edited, context=None):
    if not self.repo or not self.auto_commits or self.dry_run:
        return
    res = self.repo.commit(fnames=edited, context=context, aider_edits=True, coder=self)
    if res:
        self.show_auto_commit_outcome(res)
        commit_hash, commit_message = res
        return self.gpt_prompts.files_content_gpt_edits.format(hash=commit_hash, message=commit_message)
```
The commit path set is `edited` — only the files the AI touched. Unrelated dirty files stay out of the change; the auto-commit's diff and message both reflect that scoped set.

## Decisive source — a dirty baseline is committed BEFORE the edit (:2411-2422)
```python
def dirty_commit(self):
    if not self.need_commit_before_edits:
        return
    if not self.dirty_commits:
        return
    self.repo.commit(fnames=self.need_commit_before_edits, coder=self)
    return True
```
Edit to an already-dirty path first snapshots that baseline (so /undo can revert the AI change without destroying the user's prior work), then the AI edit is committed separately.

## Flow
1. `get_dirty_files` builds the staged+unstaged union; `is_dirty` guards each proposed edit.
2. If an edit target is already dirty, `dirty_commit` first commits that baseline under the user's existing changes.
3. `auto_commit(edited)` then commits only the edited files, generating the message from that scoped diff with the weak commit-message model.
4. Any `ANY_GIT_ERROR` is caught and surfaced as `Unable to commit`, never raising into the session.

## Invariant
- Staged and unstaged files both count as dirty (`get_dirty_files` union).
- An auto-commit is scoped to the edited path set; unrelated dirty files never sweep in (`test_only_commit_gpt_edited_file`).
- A dirty baseline is snapshot-committed before the AI edit so the AI change is individually revertable (`test_gpt_edit_to_dirty_file`).
- Temporary author/committer env is restored even when the commit fails (attribute restore in the Git wrapper).

## Probe (direct test)
- `tests/basic/test_coder.py::test_only_commit_gpt_edited_file` (:612) — asserts only the GPT-edited file is committed, leaving other dirty files untouched;
- `tests/basic/test_coder.py::test_fpt_edit_to_dirty_file` (:667) — asserts the pre-existing dirty file is committed before the GPT edit lands;
- `tests/basic/test_repo.py` covers `diffs_*` and `commit_with_custom_committer_name` (:192) / `co_authored_by` (:267) attribution boundaries.
Run `python -m pytest tests/basic/test_coder.py -k "dirty or only_commit" tests/basic/test_repo.py`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "get_dirty_files auto_commit dirty_commit scoped commit", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt scoped auto-commit (edited paths only) and baseline-before-edit dirty preservation as the safety contract. Adapt to Pi: never auto-commit originals or change Git identity by default; keep the scoped-edit guarantees under an explicit user gate.
