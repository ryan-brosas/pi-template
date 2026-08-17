# Work Records

Tracked durable engineering records for local work items. One directory per record: `.pi/work/<slug>/`; a record linked to an existing GitHub issue may use `.pi/work/<issue>-<slug>/`.

The active pointer `.pi/work/.active` and per-work dotfiles (`.progress.md`, `.verify.log`) stay ignored beside each record. This directory is committed.

## Lifecycle

A record moves through a default lane, but the lane is a suggestion, not a
pipeline — run commands freeform, in any order, and skip what the work doesn't
need.

    /research   → evidence in research.md (optional; `--slug <id>` persists without an active work item)
    /create     → issue.md + spec.md (PRD) + tasks.md; sets .active; `--from-research <id>` seeds the PRD from research.md
    /plan       → plan.md (+ proposal.md, design.md, adr.md when warranted)
    /ship       → implement the active spec end to end
    /verify     → run gates; durable result in verification.md
    PR          → optional; gh pr create, only when the record is issue-linked
    loop        → back to research/plan/ship as verification or drift demands

- `/fix`, `/audit`, and `/gc` drop in anywhere; they don't follow the lane.
- There is no `/pr` slash command. Opening a pull request is a manual
  `gh pr create` step, and only when a record is linked to a GitHub issue.
- Two PR shapes share the lane:
  - **Own project** — branch on `origin`, `gh pr create` against `main`.
  - **Contributing upstream** — fork the project, clone your fork, add the
    upstream remote, branch, push to your fork, then open the PR from
    `fork:branch` to `upstream:main`; follow the project's `CONTRIBUTING.md`
    and rebase on `upstream/main` before opening.
- The only hard rules are the Contract below: durable records are tracked,
  dotfiles stay local.

## Layout

```text
.pi/work/.active      # ignored active-work pointer, written by /create
.pi/work/<slug>/      # linked form: .pi/work/<issue>-<slug>/
├── issue.md          # local identity record; GitHub links when an issue is linked
├── spec.md           # PRD rendered by /create
├── research.md       # evidence rendered by /research (optional)
├── proposal.md       # why/what/capabilities rendered by /plan (optional)
├── design.md         # architecture decisions (optional)
├── adr.md            # architecture decision records rendered by /plan (optional)
├── plan.md           # implementation plan rendered by /plan
├── tasks.md          # task breakdown rendered by /create
├── verification.md   # final gate results rendered by /verify
├── .progress.md      # ignored per-work progress log
└── .verify.log       # ignored per-work verification log
```

## Contract

- Local work identity is the slug: `<slug>`. An optional verified GitHub issue extends a record to `<issue>-<slug>`.
- Durable records are tracked and never ignored.
- `proposal.md` (why/what), `design.md` (architecture), and `adr.md` (decisions) are optional plan companions rendered by /plan when the work warrants them.
- Raw progress, the active pointer, and verification logs live in ignored dotfiles beside each record: `.pi/work/.active`, `.pi/work/<id>/.progress.md`, `.pi/work/<id>/.verify.log`.
- Never write a durable record as a dotfile; dotfiles are local state only.
