# Aider — Human-Collaboration Layer Reference (UX)

Source-grounded reference. Read IN FULL: `watch.py` (318), `waiting.py` (221), `mdstream.py` (:1-90), `linter.py` (:1-100), `base_coder.py` reflection ranges (:924-1000, :1560-1615). Each pattern 5W1H.

---

## 1. Watch mode: AI comments in your own editor

- **WHO** — users who think better in their IDE than in a chat prompt.
- **WHAT** — a filesystem watcher that reads AI comments written in ANY source file (`// ai!`, `# ai?`) and turns them into chat requests (`watch.py`).
- **WHEN** — comment suffix decides action: `ai!` = code change (`watch_code_prompt`), `ai?` = question (`watch_ask_prompt`); bare `ai` comments ADD the file to chat without triggering.
- **WHERE** — regex :62-64, filter :84-115, `process_changes` :176-236, extraction :238-268.
- **WHY** —
  - *The chat is not the only front door*: changed files are auto-added to the chat with "Added {rel} to the chat" confirmation, and `io.interrupt_input()` cancels pending typed input (:146-147) — the file system IS the input queue.
  - *Teach the syntax on near-miss*: comments WITHOUT an action suffix get "End your comment with AI! to request changes or AI? to ask questions" (:196-199) — the UI corrects instead of ignoring.
  - *Context, not lines*: commented regions render through TreeContext with `mark_lois=True, loi_pad=3` so the model sees the enclosing scope; ValueError falls back to bare `Line N:` listings.
  - *Noise discipline*: hardcoded ignore list (editor backups, caches, IDE dirs, binaries, .env!), gitignore merging, 1MB size cap BEFORE reading, watch roots pruned by gitignore with root fallback (:92-99).
  - *Multi-language comments*: one regex covers `# // -- ;` prefixes case-insensitively; action detection strips prefixes then checks start/end for `ai!`/`ai?`.

## 2. Lint-reflect loop

- **WHO** — the model, via its own next turn.
- **WHAT** — every applied edit is auto-linted; errors become the model's NEXT USER MESSAGE (`base_coder.py:1603-1610`).
- **WHEN** — `auto_lint=True` after edits apply and commit; user CONFIRMS first ("Attempt to fix lint errors?").
- **WHERE** — reflection driver `run_one` :924-939 (max_reflections cap with warning), lint branch :1603-1610, second commit context="Ran the linter" :1606, per-language linters + `set_linter` override :29-36/:54-58.
- **WHY** — *errors are conversation fuel*: lint output isn't logged, it's REFLECTED — the same mechanism the edit-failure loop uses, capped at max_reflections so loops terminate loudly ("Only N reflections allowed, stopping."). The commit AFTER linting records the fixed state with its own message.
- **HOW** — python gets a built-in tree-sitter-flavored linter; other languages take configured shell commands whose stderr is parsed for filename:line pairs (`find_filenames_and_linenums`) to focus TreeContext rendering on error regions.

## 3. Commit-per-edit with a weak-model scribe

- **WHO** — git history readers; the human reviewing what the AI did.
- **WHAT** — every successful edit round auto-commits with an LLM-generated message from the DIFF, using a cheap dedicated model (`commit_message_models()` :441).
- **WHEN** — `auto_commit(edited)` post-apply; AGAIN after linting with context "Ran the linter"; skipped when no repo/auto_commits off/dry_run (:2375-2380).
- **WHY** — atomic commits make every AI change reviewable/revertable independently; a weak model writes messages because summarizing diffs is cheap — never spend frontier tokens on commit prose. Failed message generation falls back to prompt-level text (`files_content_gpt_edits_no_repo`).

## 4. Spinner (delayed, honest, ASCII-first)

- **WHO** — users waiting on slow LLM calls.
- **WHAT** — bouncing scan-line spinner, thread-based, killable (`waiting.py`).
- **WHEN** — shown only after 0.5s elapsed (:96-100): fast operations NEVER flash; frames capped at 0.1s.
- **WHERE** — frames :33-56, unicode probe :85-94, step() :95-152, WaitingSpinner wrapper :155-190.
- **WHY** —
  - *Unicode support is TESTED, not assumed*: write palette + backspaces + spaces to stdout and catch UnicodeEncodeError (:85-94) — limited terminals keep pure-ASCII `#=` frames.
  - *Animation continuity across instances*: `last_frame_idx` is a CLASS variable — successive spinners don't restart from frame zero.
  - *Line hygiene*: each tick pads to clear remnants of longer previous text and positions the cursor over the scan char via computed backspaces; end() clears the full last length and restores the cursor.
  - Progress TEXT updates live (`spin.step(f"... {show_tokens} tokens")` during repo-map binary search — the waiting indicator doubles as a progress report).

## 5. Streaming markdown (mdstream)

- **WHO** — users watching replies render live.
- **WHAT** — rich Live + custom Markdown elements (`mdstream.py`).
- **WHY** — code blocks drop rich padding (`NoInsetCodeBlock`: terminals already indent) and headings force LEFT alignment with a heavy-border panel only on h1 — dense terminal layout over print conventions.

## 6. Interrupt & misc etiquette

- Double-^C exits (2s window), single ^C warns "^C again to exit" (:994-999).
- An interrupt mid-reply is RECORDED into the transcript as `^C KeyboardInterrupt` + assistant ack (:1580-1590) — the model knows its reply was cut, on the next turn.
- URLs in user input trigger an offer-to-scrape confirm group with allow_never (:967-984).
