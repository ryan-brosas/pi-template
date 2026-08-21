# Foundations Workflow — Skill Anatomy

The target structure for a foundation skill: a lean surface plus focused topic references. Includes the validator constraints that shape it.

## Directory layout

```
.pi/skills/pack-foundations/<name>-foundation/
├── SKILL.md              # LEAN surface (~230-280 words): what loads into context
└── references/
    ├── architecture.md   # solves, stack, full module map, data flow, graph signals
    ├── <subsystem>.md    # one file per major subsystem (what it gives, e.g. secret-defense.md)
    └── reuse-guide.md    # use cases, every reusable primitive, red flags, verification, provenance
```

## Lean SKILL.md anatomy (in order)

1. **Frontmatter**:
   - `name: <name>-foundation` — lowercase kebab, matches the directory.
   - `description:` — **trigger-first** (`Use when ...`), <= 240 chars, wrap in double quotes if it contains `: ` (an unquoted colon-space reads as YAML mapping and fails hygiene).
   - `disable-model-invocation: true` — leaves are hidden; loaded on demand via the pack router or `/skill:<name>`.
2. **`# <Title>`**.
3. **`## Solves`** — 1-2 lines. What the repo actually does.
4. **`## When to use`** — the trigger situations.
5. **`## Key skill-lines`** — the actionable reuse contract, one bullet each: *when you need X -> repo Y's Z at path P*. Exact paths, exact symbol names.
6. **`## Full view (memory graph)`** — mandatory; see graph-rules.md for the template.
7. **`## References (load on demand)`** — one bullet per reference file with what it holds.
8. **`## Skill Result Contract`** — the xml block (status/evidence/artifacts/risks).

## What goes where

| Content | Surface (SKILL.md) | References |
|---|---|---|
| Trigger + solves | yes | expanded in architecture.md |
| Reuse pointers (skill-lines) | yes, one line each | expanded with signatures in reuse-guide.md |
| Architecture map | no | architecture.md |
| Primitive deep-dives | no | per-subsystem files |
| Constants/env vars/defaults | no | per-subsystem files |
| Edge cases from source comments | no | per-subsystem files |
| Red flags | no | reuse-guide.md |
| Verification | no | reuse-guide.md (+ per-subsystem) |
| Provenance | no | reuse-guide.md |

Rationale: leaves are `disable-model-invocation: true` — zero context cost until loaded — but the load itself should still be cheap. The surface answers "is this the right skill and what's the shortcut?"; the references answer "how do I port it exactly?".

## Validator constraints (scripts/validate-skill-packs.mjs)

- Description must be trigger-first (`^Use when `) and <= 240 chars (hidden leaves).
- Description > 1024 chars fails; unquoted `": "` fails hygiene.
- Name: lowercase/digits/hyphens, <= 64 chars, no leading/trailing/consecutive hyphens.
- Every leaf in exactly one pack (`packs.json` members) or visibleCore; duplicate membership fails.
- Leaves MUST have `disable-model-invocation: true`; routers MUST NOT.
- Router SKILL.md word budget: 190 words total (compact member lines).
- Router member list must equal packs.json members exactly (parity both ways).
- Stale vocabulary regex fails the file: TaskCreate | TaskUpdate | ask_user_question | web_fetch | grepsearch | superpi.
- Word threshold: SKILL.md > 600 words warns (references/ files are NOT counted — this is why depth lives there).
- Manifest parity: retained ledger must match packs.json + disk; regenerate with `node scripts/sync-skill-manifest.mjs`.
- Release hygiene: README skill/leaf/pack counts must match the tree exactly.

## Naming conventions

- Leaf dir/skill: `<repo-name>-foundation` (e.g. `localterm-foundation`).
- Reference files: lowercase kebab topic names matching the repo convention (cf. `swift-concurrency/references/actors.md`) — e.g. `architecture.md`, `secret-defense.md`, `reuse-guide.md`. Never one monolithic DEEP.md.
- Graph project name: clean repo name (pass `name` to index_repository); never the path-derived form.

## Provenance requirements (every skill)

- Owner + license (from LICENSE head) + branch + commit + date (from `git log -1`).
- Root path on disk + graph project name + node/edge counts.
- Recorded in reuse-guide.md under Provenance.
