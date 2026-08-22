<!-- capsule-v2 -->
# Collaboration loop — watch-mode AI comments + bounded reflection

**Source:** Aider MIT `main@5dc9490bb35f9729e06ee5d00a19ccd70c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a harness let a human drive the model from their own editor and terminate self-correction loops instead of spinning forever?

## Path/Symbol
`aider/watch.py`: `FileWatcher.get_ai_comments(filepath)` (:257), `ai_comment_pattern` (:69), `FileWatcher.handle_changes` action dispatch (:185-215). `aider/coders/base_coder.py`: `Coder.run_one(user_message, preproc)` (:924), `max_reflections = 3` (:101), `num_reflections = 0` (:100).

## Signature & Data Shape
`get_ai_comments` returns `(line_nums, comments, has_action)` where `has_action` is `None` (just add), `"!"` (change), or `"?"` (question). `run_one` drives a `while message:` loop where a set `self.reflected_message` becomes the next user message.

## Decisive source — the AI-comment regex and action classification (:69-82, :266-284)
```python
ai_comment_pattern = re.compile(
    r"(?:#|//|--|;+) *(?:ai\\b.*|.*\\bai[?!]?) *$", re.IGNORECASE
)

for i, line in enumerate(content.splitlines(), 1):
    if match := self.ai_comment_pattern.search(line):
        comment = match.group(0).strip()
        comment = comment.lower().lstrip("/#-;").strip()
        if comment.startswith("ai!") or comment.endswith("ai!"):
            has_action = "!"
        elif comment.startswith("ai?") or comment.endswith("ai?"):
            has_action = "?"
```
The watcher preserves the author's comment text verbatim; it classifies the action suffix but never paraphrases the request.

## Decisive source — the reflection loop is explicitly bounded (:924-944)
```python
while message:
    self.reflected_message = None
    list(self.send_message(message))
    if not self.reflected_message:
        break
    if self.num_reflections >= self.max_reflections:
        self.io.tool_warning(f"Only {self.max_reflections} reflections allowed, stopping.")
        return
    self.num_reflections += 1
    message = self.reflected_message
```
The cap is checked before re-entering the loop, so it can never run more than `max_reflections` turns; reaching it warns and returns. `run_one` resets `num_reflections` per call, so termination binds per interaction.

## Flow
1. `run_one` sends the message, reads `reflected_message`, and reruns until it is None or the cap is hit.
2. A `FileWatcher` watches the workspace; on a changed file carrying an AI comment it adds the file to chat and, when the action suffix is `!`/`?`, pauses user input (`io.interrupt_input()`) — the filesystem is the input queue.
3. `!` routes to `watch_code_prompt`, `?` to `watch_ask_prompt`; a bare `ai` comment only auto-adds the file.
4. Applied edits auto-lint; lint failures become `reflected_message`, fed back as the next user message until the cap.

## Flow
See the wavelength above: watch classify → add/route → run_one reflection loop → lint reflects → capped termination.

## Invariant
- The reflection loop can never exceed `max_reflections` turns; the cap warns and returns rather than recursing.
- The watcher passes author comment text verbatim, never a paraphrase.
- Only suffix-classified comments (`ai!`, `ai?`) dispatch action; bare `ai` merely adds the file.

## Probe (direct test)
`tests/basic/test_watch.py`: `test_ai_comment_pattern` (:115) runs fixtures `watch.py`, `watch.js`, `watch_question.js`, `watch.lisp` asserting exact unique comment counts (10, 10/16, 6, 7) and that `get_ai_comments` returns the expected action (`!` vs `?`). `test_gitignore_patterns` (:18) and `test_handle_changes` (:99) cover noise discipline and auto-add.
Run `python -m pytest tests/basic/test_watch.py -k "ai_comment or gitignore or handle_changes"`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "get_ai_comments run_one reflected_message watch", limit: 12, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt watch-mode as the primary I/O and the capped reflection loop as the safety valve; port verbatim-comment fidelity and the per-interaction counter. Provide-edits "you're the user" — the model's turn ends when the human edits the file.
