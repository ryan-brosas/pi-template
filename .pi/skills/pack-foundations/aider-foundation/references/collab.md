# Aider — Human-Collaboration Layer Reference (UX)

Source-grounded reference for how aider treats its human as a collaborator rather than an operator. Files: `aider/watch.py` (318 lines, read in full), `aider/base_coder.py` reflection regions (~:924-1000, ~:1560-1615), `aider/waiting.py` (221 lines, full), `aider/mdstream.py` (:1-90).

## Watch mode: AI comments in your own editor

A `FileWatcher` (watch.py) watches the workspace for source files containing AI comments — a regex covering `# // -- ;` comment prefixes case-insensitively, with an ACTION SUFFIX determining what happens (:62-64): `ai!` requests code changes via `watch_code_prompt`, `ai?` asks a question via `watch_ask_prompt`, and a bare `ai` comment merely ADDS the file to the chat with a confirmation ("Added {rel_fname} to the chat", :196-199). Changed files pause whatever the user was typing (`io.interrupt_input()`, :146-147): the filesystem IS the input queue.

Two teaching details deserve porting: near-miss comments (no action suffix) get "End your comment with AI! to request changes or AI? to ask questions" (:196-199) — the UI corrects instead of ignoring. And commented regions render through TreeContext with `mark_lois=True, loi_pad=3` so the model sees the enclosing scope, with a bare `Line N: comment` fallback on ValueError (:186-236). Noise discipline: a hardcoded ignore list (editor backups, caches, IDE dirs, binaries, `.env`) merges with gitignores, and a 1MB size check gates reading (:84-115).

COMMENT FIDELITY: the watcher captures the comment text verbatim — the model parses the AUTHOR's words, not a paraphrase.

## Lint reflection: quality failures as the model's next turn

Applied edits auto-lint (`auto_lint=True`), and lint errors become the model's NEXT USER MESSAGE via the reflection loop (`base_coder.py:1603-1610`). Errors are conversation fuel, capped by max_reflections so loops terminate loudly ("Only N reflections allowed, stopping."). The user confirms first ("Attempt to fix lint errors?"), the fix round auto-commits with context="Ran the linter" (:1606), and `run_one` drives the while-message loop where reflected_message replaces the next input (:924-939).

## Commit-per-edit with a weak-model scribe

Every successful edit round auto-commits with an LLM-generated message from the DIFF, using a dedicated cheap model (`commit_message_models()`, :441). The rationale: atomic commits make each AI change independently reviewable/revertable, and summarizing diffs must never spend frontier tokens. Message-generation failure falls back to prompt-level text (`files_content_gpt_edits_no_repo`).

## The spinner: delayed, honest, ASCII-first

The WaitingSpinner (waiting.py) shows only after 0.25s of work (:96-100) — fast operations never flash. Frames are pre-rendered ASCII (`#=`), upgraded to a unicode palette only after a LIVE terminal probe that catches UnicodeEncodeError (:85-94); `last_frame_idx` is a class variable so successive spinners continue the animation rather than restarting (:27). Line hygiene: every tick pads to clear longer previous text and backspaces the cursor to the scan character; end() clears and restores. Progress text updates live (spin.step) so the waiting indicator doubles as a progress report.

## Streaming markdown (mdstream.py)

Rich Live rendering with two template overrides: code blocks drop rich padding (`NoInsetCodeBlock` — terminals already indent), and headings force LEFT justification with a heavy-border panel only on h1 (`LeftHeading`, :18-44).

## Interrupt etiquette

Double-^C exits (2s window, :994-999); a single ^C warns "^C again to exit"; an interrupt mid-reply is RECORDED into the transcript as `^C KeyboardInterrupt` plus an assistant acknowledgment (:1580-1590) so the model knows its reply was cut. URLs in user input trigger an offer-to-scrape confirm GROUP with allow_never semantics (:967-984).

## Verification

`tests/basic/test_io.py` (612 lines) pins the IO layer behaviors enumerated above; watch-mode AI-comment extraction is exercised through `get_ai_comments` unit paths in the same harness (`test_watch.py`); `mdstream` behavior surfaces via rich rendering smoke tests.

## Capsule evidence (current source)
- **Path/Symbol:** `aider/coders/base_coder.py` — `Coder.run_one(user_message, preproc)`; `aider/watch.py` — `FileWatcher.get_ai_comments(filepath)`.
- **Flow:** `reflected_message` drives a new turn until `max_reflections`; watched comments return line numbers, verbatim text, and action classification.
- **Invariant:** capped reflection exits loudly; `ai!` and `ai?` retain distinct actions.
- **Probe:** at the cap, no extra model turn occurs; classify both action suffixes.
- **Retrieve:** `mcp.codebase_memory.search_graph({project: "aider", query: "run_one reflected_message get_ai_comments"})`.
