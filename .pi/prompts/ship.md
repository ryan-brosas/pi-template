---
description: Implement the active specification end to end with verification
argument-hint: "<id>"
---

# Ship: $ARGUMENTS

Implement the active specification end to end: read the spec, run the plan as an assembly line of stations, verify each station, and report.
> **Workflow:** `/create` → `/plan` (optional) → **`/ship`** → `/verify`

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| `<id>` | active slug | Feature id from `.pi/work/.active` |

## Phase 0: Load Skills

Load the skill at `.pi/skills/pack-delivery/test-driven-development/SKILL.md`, then
`.pi/skills/verification-before-completion/SKILL.md`.

## Phase 1: Gather Context

Read `.pi/work/$(cat .pi/work/.active)/spec.md` to understand the requirements.

Read `.pi/work/$(cat .pi/work/.active)/` to check what plan artifacts exist (plan.md, research.md, proposal.md, design.md, adr.md).

**Guards:**
- [ ] Spec exists and is up to date
- [ ] You have read the full spec

## Phase 2: Station Independence Check

Parse the plan (`.pi/work/$(cat .pi/work/.active)/plan.md`) if present; each station S1..Sn carries its task, acceptance check, and handoff payload. Otherwise derive stations from the spec and tasks.md, giving each station an id, an acceptance check, and a payload for the next station. Fold `design.md` architecture decisions and `adr.md` records into station handoff payloads and risks; `proposal.md` frames the goal and non-goals.

For each station record its `files` (from tasks.md metadata or the plan).

Group stations:
- **Independent stations** (no overlapping files) — run independent read-only discovery and checks in parallel batches; serialize all file mutations; one direct execution pass per station. Agents and subagents are unsupported: never dispatch one and never simulate delegation.
- **Dependent stations** (shared or chained files) — run strictly in order.

If two stations touch the same file, they are dependent regardless of what the plan says. Flag and serialize them.

## Phase 3: Assembly-Line Execution (TDD)

Run each station in dependency order through the station loop:

1. **Package** — state the station id, task text, acceptance checks, handoff payload, permitted files, key symbols/invariants, and the smallest verification command before any edit.
2. **Implement** — write a failing test for the next behavior (project test conventions), then the minimal code to pass. Direct sequential edits in this session; serialize all file mutations.
3. **Acceptance review** — run every acceptance check, inspect output + exit code, and record command + output tail per station.
4. **Quality review** — read the diff as if a new teammate wrote it: intent, edge cases, naming, consistency, dead code.
5. **Correct (max two rounds)** — address findings with scoped edits; re-review only the original findings and the correction diff. New observations are notes, not round reopeners.
6. **Ledger** — append the outcome to `.progress.md` keyed by station id (status, checks, findings, rulings, payload passed on) and update the station list.
7. **Compact** — request programmatic compaction (`compact.request`) where the host supports it, so the next station starts from the compacted context plus its handoff payload.
8. **Next station** — proceed in dependency order. Re-run the combined check when two stations share a seam.
9. Stop on BLOCKED (same-approach failure twice, or a load-bearing finding past two rounds), plan conflict, destructive action, or ambiguity.

For independent stations, run their read-only discovery and checks in parallel batches where tooling allows; keep all file mutations sequential and run the combined check once at the end.

**Rules:**
- Smallest working change, scoped to known territory
- No speculative abstractions or error handling for impossible scenarios
- Surgical diffs only — every changed line traces to the current request
- Unrelated issues get `NOTICED BUT NOT TOUCHING: ...` and move on
- For novel/unclear work: prototype, show variants, or ask before editing
- Never dispatch or simulate an agent/subagent for implementation or review

## Phase 4: Final Whole-Change Review

After the last station:
- Review the complete diff across stations for integration breaks, duplicated seams, and spec drift.
- Re-check the current tree — other work may have landed.
- Run the project's full gate if one exists (tests, lint, typecheck, build).

## Phase 5: Verify

Run the change's verification commands and record exact outcomes. A build alone is not completion evidence.

Follow the verification protocol: `.pi/skills/verification-before-completion/references/VERIFICATION_PROTOCOL.md`.

**Failure handling:** if verification fails, fix or surface the failure — do not claim done.

## Phase 6: Report (output contract)

Append progress to `.pi/work/$(cat .pi/work/.active)/.progress.md`, updating the station ledger.

Output:
1. **Completed stations** with per-station acceptance evidence, keyed by station id
2. **Verification results** (typecheck/lint/test/build)
3. **Deviations** from the plan, with reasons
4. **Deferred work** with `TODO(handle): what, on-or-after <date>` markers
5. **Next step**: `/verify` to run the full gate, or fix listed issues

## Prewalk boundary

Reading and planning are read-only. Before the first edit, call
`prewalk.checklist({ ... })` inside fabric_exec with the matching disposition:
`trivial: true` for one or two small edits, `easy: true` plus 2-4 items and
Schema for bounded work, or 5-9 items plus Schema for full work; every
items-bearing checklist requires the Schema contract. Wait for accepted handoff,
then implement as the executor. Keep the checklist active until every item and
validation is complete; mark each with `[DONE:n]`. If acceptance is denied or
scope changes, do not mutate. After verification, record the decision with `workflow.gate({ gate, passed, disposition, evidence })` (evidence kinds: command, artifact, trace, custom) and report the recorded decision.

**Dual mode.** Read-only discovery is identical in both modes; only mutation
authorization differs. Prewalk mode (armed): the flow above applies. Main-session
mode (no prewalk): prewalk is unavailable or not armed; propose each mutation to
the user and apply only after explicit approval of the exact action and files.
Detect at the mutation boundary: accepted checklist → prewalk mode; not-armed
rejection or absent `prewalk` → main-session mode.

## Related Commands

| Need | Command |
| --- | --- |
| Create the spec first | `/create` |
| Deeper planning | `/plan` |
| Run the full gate | `/verify` |
