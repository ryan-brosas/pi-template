---
description: Audit codebase for a specific pattern
argument-hint: "<pattern>"
---

# Audit: $ARGUMENTS

Find every occurrence of a code pattern, review each match for correctness, security, and edge cases, then produce a prioritized remediation list.
> Use for cross-cutting concerns: auth checks, error handling, API patterns, security vulnerabilities, TODO debt, or a specific function/style.

## Read-only

This command is read-only: it discovers, grades, and reports. It never edits code.
If remediation is wanted, a later accepted prewalk checklist authorizes mutation.

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| Pattern | required | Code pattern, symbol, or string to search for |

**Examples:**
- `/audit console.log` — every debug log
- `/audit fetch(` — every fetch call and its error handling
- `/audit app.use(` — every middleware registration
- `/audit dangerouslySetInnerHTML` — injection surface

## Phase 1: Discover

Choose the right search for the pattern type:
- **Symbol or API** (function name, class, method): use codemap search (symbols) to get definitions and call sites with file:line.
- **Structural pattern** (try/catch, error-return checks): use codemap search with a regex query.
- **Literal text** (strings, comments, TODO markers): use `rg -n` over the relevant directories.

Group results by subdirectory. For each match record: `file:line` and one line of context. If the pattern has common variations (e.g. `fetch(`, `await fetch(`, `fetch().then(`), include them.

## Phase 2: Audit Each Match

For every occurrence, read enough surrounding code (10-30 lines) to grade it:

| Severity | Meaning | Example |
| --- | --- | --- |
| Critical | Security hole, data loss, crash on main path | Missing auth check, unvalidated input into SQL/shell |
| Important | Wrong behavior in production paths | Swallowed error, missing cleanup, off-by-one |
| Minor | Style, duplication, dead path, debug leftover | console.log, unused variable |
| Correct | No issue — pattern is used appropriately | Properly wrapped try/finally |

Do not grade from the match line alone; context determines severity.
For suspicious matches (security-sensitive pattern), check the surrounding validation, authorization, and error handling before grading.

## Phase 3: Synthesize

Order issues by severity, then by blast radius (files affected, callers, data touched).
For each Critical/Important issue, propose a concrete fix with a file:line anchor.

## Phase 4: Report (output contract)

Report:

1. **Pattern:** [searched pattern]
2. **Occurrences:** [count] | **Files:** [count]
3. **By severity:** Critical [N] · Important [N] · Minor [N] · Correct [N]
4. **Critical/Important issues:** for each: `file:line`, what is wrong, why it matters, proposed fix
5. **Correct uses:** brief list (proves the pattern is not inherently bad)
6. **Coverage note:** which directories were searched, which were skipped (e.g. vendored, generated)

If the user asks for a written report file, write it only after an accepted prewalk handoff authorizes the write. **Dual mode:** read-only discovery is identical in both modes; a report-file write branches by mode — prewalk mode uses an accepted `prewalk.checklist({ ... })` handoff, main-session mode proposes the exact file and content for explicit user approval. Detect at the write boundary: accepted checklist → prewalk mode; not-armed rejection or absent `prewalk` → main-session mode.

## Related Commands

| Need | Command |
| --- | --- |
| Research a topic | `/research` |
| Create a fix spec | `/create` |
| Verify gates | `/verify` |
