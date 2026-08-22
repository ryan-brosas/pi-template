<!-- capsule-v2 -->
# Human I/O — batch-scoped confirmations, never-prompts, interrupt safety

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a terminal harness ask for consent without nagging, batch the same decision across many files, and survive interrupts without losing the user's input?

## Path/Symbol
`aider/io.py`: `InputOutput.confirm_ask(question, default="y", subject=None, explicit_yes_required=False, group=None, allow_never=False)` (:807), `ConfirmGroup` (:82), `self.never_prompts` (:269), `restore_multiline` decorator (:57), `get_input` (:523).

## Signature & Data Shape
`confirm_ask` routes through a cascade: never-prompt set -> `self.yes` tri-state -> group.preference replay -> interactive input, returning True/False. A `ConfirmGroup` shared across per-file confirms posts an all/skip decision to `preference`, replaying it for siblings without re-prompting. `never_prompts` is a `(question, subject)` set.

## Decisive source — resolution cascade and group replay (:823-876)
```python
if question_id in self.never_prompts:
    return False
if group and not group.show_group:
    group = None
if group:
    allow_never = True
...
if self.yes is True:
    res = "n" if explicit_yes_required else "y"   # blanket yes downgraded when unsafe
elif group and group.preference:
    res = group.preference
    self.user_input(f"{question}{res}", log_only=False)
else:
    while True:  # interactive; EOF degrades to default, any unambiguous prefix accepted
        ...
        res = res.lower()[0]
```
Safety-aware: when `explicit_yes_required`, blanket yes yields res="n" and the (A)ll option is withheld from the prompt string.

## Decisive source — answers echo to the transcript; "d" records suppression key (:896-910)
```python
res = res.lower()[0]
if res == "d" and allow_never:
    self.never_prompts.add(question_id)         # (question, subject) tuple
self.append_chat_history(...                     # confirmed answers land blockquoted in the record
```
Because the suppression key includes `subject`, "don't ask about file X" never silences file Y. Every confirmed answer lands in the chat transcript (blockquoted), so the model sees what was decided.

## Flow
1. resolve never-prompt; demote single-item groups; force allow_never=True whenever a group is active
2. resolve (capped) yes/no; a shared group preference short-circuits; otherwise loop interactively;
3. normalize any unambiguous prefix to its first char; d records a permanent (in-process) dismissal;
4. inner prompts are wrapped by `restore_multiline` so a confirm firing mid-composition forces single-line input and restores it in a finally.

## Invariant
- Group confirmations present the decision ONCE per set; siblings replay the shared preference.
- `explicit_yes_required` overrides blanket yes and hides the (A)ll option for dangerous paths.
- `never_prompts` keys on `(question, subject)`; dismissals are in-process only, so restarts restore safety prompts.
- Nested prompts cannot leak a changed multiline mode (`restore_multiline` clears + finally restores).

## Probe (direct test)
`tests/basic/test_io.py`: `test_confirm_ask_with_group` (after preference="all", `mock_input.assert_not_called()`), `test_confirm_ask_explicit_yes_required` (assertNotIn("(A)ll", prompt_text)), `test_multiline_mode_restored_after_interrupt` (mocks a raise, asserts finally restoration).
Run `python -m pytest tests/basic/test_io.py -k "confirm_ask or multiline"`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "confirm_ask ConfirmGroup never_prompts restore_multiline", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the shared-preference confirmation object and the (question, subject) never-set as the safe consent model: ask once, remember the group decision, key dismissals by (question, subject), and make destructive paths explicit-yes.
