# Aider — Human I/O Layer Reference (UX)

Complete source-grounded reference for how aider talks to its human. Files: `aider/io.py` (1,192 lines, read in full) with probes from `tests/basic/test_io.py` (612 lines, read in full), plus confirmation call-sites in `coders/base_coder.py`.

## confirm_ask: batch-scoped preference memory turns N prompts into one

Every user confirmation flows through `confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)` (:806-925), resolving through a four-tier cascade: never_prompts short-circuit → `self.yes` tri-state override → **group preference replay** → live interactive loop.

The group mechanism exists precisely for multi-item operations. Callers share one `ConfirmGroup(items=files)` across per-file edit confirmations; answering **all** or **skip** writes `group.preference`, and every later confirm sharing that object replays the answer WITHOUT prompting — echoing it into the transcript as if typed (:874-876). Single-item groups demote to None (:824-825): no point showing "(1/1)".

Two safety details deserve porting verbatim:

- Blanket-yes is deliberately DOWNGRADED for dangerous confirms (:869-870): even with `--yes`, `explicit_yes_required` forces `res = "n"` — and the `(A)ll` option is withheld from the prompt string entirely (:831-832).
- EOF mid-prompt degrades to default: "# Treat EOF (Ctrl+D) as if the user pressed Enter" (:884-888).

Answer normalization accepts any unambiguous prefix then collapses to first char (:893-899); every resolution lands in the chat history as a blockquoted line (:923-924).

**Lesson:** model repeated confirmations as a shared mutable preference OBJECT, not a boolean return — the IO layer owns both asking and remembering, and yes-everything flags must be overridable per-call by an explicit_yes_required escape hatch.

**Probe:** tests :209-249 — after preference='all', `mock_input.assert_not_called()`; under explicit_yes_required, `assertNotIn("(A)ll", prompt_text)`.

## allow_never: per-(question, subject) permanent suppression

Answering **d** records `(question, subject)` into `never_prompts` (:901-907); identical pairs silently return False forever (in-process only — restart restores safety prompts). The suppression KEY includes subject, so "don't ask about file X" never silences file Y.

One coercion rule shows the design thinking (:826-827): `if group: allow_never = True` — batch flows are exactly where users want to opt out of the remaining N−1 prompts individually rather than answer All/Skip.

**Lesson:** key permanent dismissals by (question, context-subject) tuples, auto-enable dismissal wherever batching exists, keep the dismissal set ephemeral so restarts restore safety prompts.

**Probe:** tests :304-341 — membership asserted per tuple; allow_never=False ignores 'd' entirely (two prompts then 'n').

## Deferred bells: signal attention-demand transitions, not activity

Aider arms `bell_on_next_input = True` when handing off to the LLM (:1050-1052) and consumes-and-clears it at the next BLOCKING input point — get_input, confirm_ask, or prompt_ask all call ring_bell() first (:469/:817/:933). The event worth signaling is "aider now needs you," not "aider started"; flag-and-clear prevents notification storms across back-to-back prompts.

When configured, ring_bell escalates from terminal bell (`print("\a")`) to desktop notification via an OS-probed command (:1054-1086): macOS tries terminal-notifier then osascript, Linux iterates notify-send/zenity, Windows builds a PowerShell MessageBox. Failures warn without breaking flow.

**Lesson:** arm a one-shot flag at async handoff and let every blocking-input sink consume-and-clear it, with an OS-probed escalation path from bell to desktop notification.

**Probe:** manual — llm_started() then two consecutive confirm_asks must emit exactly one `\a`.

## Multiline input: mode toggle AND content sentinel, with reentrancy armor

Two independent mechanisms coexist (:523-735):

- **Mode toggle**: Enter inserts newline, Alt-Enter submits (toggle messages verbatim at :1105-1115).
- **Brace protocol**: a line exactly `{` opens collection; `{tag}` (alphanumeric only) opens a TAGGED block closed by exactly `tag}`; any other line starting with `{` is ordinary input. The strict reconstruction `stripped == "{" + tag` is the disambiguator — code braces in chat input must not trigger capture.

Nested prompts get armor via the `restore_multiline` decorator (:57-66): save outer mode, force False, restore in FINALLY — so a confirm_ask firing mid-composition always submits on Enter, and KeyboardInterrupt cannot corrupt the outer editing state (tests :352-377 mock the raise and assert restoration).

**Lesson:** give CLI multiline both a mode toggle and a content-level sentinel strict enough to reject lookalike content lines, and wrap any nested prompt in save/force/restore-finally against interrupt-driven reentrancy.

**Probe:** ['{','def f():','}'] accumulates 'def f():\n'; ['{not a tag!}'] returns immediately as ordinary text.

## Interrupts as data-preserving events (plus a dead except clause)

Ctrl-C during composition snapshots the live buffer before exiting (:518-520) and promotes it to a consume-once DEFAULT on the next prompt (:641-644) — losing a half-written prompt is the classic CLI rage-point, so interrupts are non-destructive. `set_placeholder` doubles as a general one-shot prefill API used by commands after failed flows.

File-watcher interrupts short-circuit differently: they convert into structured RETURN VALUES — the watcher's suggested command becomes get_input's return (:610-618) rather than an exception.

And one latent bug is documented by the study itself: the exception ladder catches `Exception` BEFORE `UnicodeEncodeError` (:620-637) — structurally unreachable narrow clause, so an encode error dumps a raw traceback instead of the intended graceful degradation. Order except clauses narrow-to-wide or the narrow handler is silently dead.

**Lesson:** treat interrupts as data-preserving events — snapshot the live buffer into a consume-once default, route watcher-triggered interrupts into structured return values, and order except clauses narrow-to-wide.

**Probe:** tests :150-169 exercise the fallback path; pinning the dead-clause regression requires reordering io.py:628-631 above the Exception clause.

## Output conventions: paired transcripts, ASCII fallbacks, self-muting channels

Four functions form the vocabulary (:966-1012): tool_output / tool_error (red, increments a class counter) / tool_warning (orange) / log_only writes. ALL channels dual-write: console print AND blockquoted chat-history append — the transcript is a faithful record of everything the human saw. The empty-call idiom `tool_output()` is the sanctioned vertical-spacing convention; spacing belongs to the emitter.

Robustness patterns worth copying:

- **ASCII fallback** (:980-985): on UnicodeEncodeError, re-encode with errors="replace" and reprint (tested at :340-356 with lone surrogates → "Hello ?World").
- **Bold quirk**: pretty mode maps bold to RichStyle REVERSE (:1004-1010) — video inversion, not weight.
- **Self-muting side-channels**: history-file write failures NULL the file attribute permanently (:1130-1136, also input-history mkdir :296-300) — "a broken side-channel must never break or spam the interactive session."
- **Color validation up front** (:374-398): every configured color is RichStyle-validated at construction, invalid ones nulled with warnings, preventing ColorParseError at print time (tests :381-404 drive hex colors lacking '#').

**Lesson:** give every machine-to-human channel a paired durable transcript write with fixed markdown shaping, catch encode failures with ASCII-replace reprint, validate styling at construction, and let persistent side-channels disable themselves after first failure rather than degrade the interactive path.

**Probe:** patched console.print raising UnicodeEncodeError once asserts two print calls and replaced output; hex colors without '#' produce no ColorParseError escape.
