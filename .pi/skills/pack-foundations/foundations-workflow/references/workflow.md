# Foundations Workflow — The Seven Steps

The full walkthrough for turning an indexed repository / memory-graph project into a detailed foundation skill. Every step names the exact tool call and what to extract.

## Step 1 — Inventory

`codebase_memory_list_projects({})` -> find the repo. Record:
- `name` — the graph project id you'll cite in every later call.
- `root_path` — where the source lives on disk.
- `branch` — provenance.
- `nodes` / `edges` — size signal.

If it's not indexed: `codebase_memory_index_repository({ repo_path, mode: "full", name })`. **Pitfall:** without `name`, the server derives one from the path (`mnt-hdd-utopia-inspo-<repo>`), which forks a duplicate index. Always pass a clean `name`; if a derived-name duplicate already exists, remove it with `codebase_memory_delete_project({ project })` after confirming the canonical index is fresh.

## Step 2 — Graph deep-pass (the double-check lens)

`codebase_memory_get_architecture({ project, aspects: ["overview", "entry_points", "hotspots", "boundaries", "languages", "packages"] })`. Extract:

| Signal | What it tells you | How to use it |
|---|---|---|
| `total_nodes` / `total_edges` | size + connectivity | sets expectations for the deep pass |
| `languages` | the implementation mix | what the ported code will look like |
| `packages` (+ nodes per package) | the subsystems | candidate sections for the references split |
| `entry_points` | where execution starts | your reading order for Step 4 |
| `hotspots` (fan_in) | the most-reused symbols | **usually the reusable primitives** — read these first |
| `boundaries` | package-to-package call counts | the dependency map; what depends on what |

Also available: `routes`, `clusters`, `layers`, `cycles` (opt-in only).

## Step 3 — Coverage check (never assume)

`codebase_memory_check_index_coverage({ project, paths: ["<paths you plan to cite>"] })`. Statuses:
- `no_recorded_issue` + `metadata_match` — indexed and fresh; safe to cite.
- `excluded` / `not_indexed` — gitignore or skip-list; **read those from source directly**, and say so in the skill.
- `metadata_changed` / stale freshness — re-index before trusting (`index_repository` again).

The response also reports the repo's ignore posture (`not_indexed.dirs/files` with reasons) — useful for the reuse-guide's provenance notes.

## Step 4 — Source grounding (the ground truth)

Read the REAL files the graph pointed at:
- `head -3 LICENSE*` + `git log -1 --format='%h %ad %s' --date=short` — owner, license, commit, date.
- The actual primitives the hotspots/entry-points name — read them **fully**: exact function names, signatures, constants, env vars, defaults, and the edge cases documented in comments.
- The tests, if present — **they are the contract**; port them with the primitive.
- Config schemas — note validation rules and which fields are compatibility contracts.

Record everything you'll cite: paths, symbol names, constant values, measured thresholds, error messages.

## Step 5 — Write the skill (lean surface + split references)

Target: `.pi/skills/pack-foundations/<name>-foundation/`. See `skill-anatomy.md` for the full structure and validator constraints. Summary:
- `SKILL.md` — LEAN (~230-280 words): trigger-first frontmatter, Solves, When to use, Key skill-lines, Full view (memory graph), References index, Skill Result Contract.
- `references/architecture.md` — solves, stack, full module map, data flow, graph signals.
- One reference per major subsystem (named after what it gives, e.g. `secret-defense.md`, `terminal-pty.md`).
- `references/reuse-guide.md` — use cases, every reusable primitive with paths, red flags, verification, provenance.

## Step 6 — Wire it in

See `wiring-verification.md` for the exact edits and the common failures. Summary: `packs.json` member + `_descriptions`; router member line; `node scripts/sync-skill-manifest.mjs`; README count bumps.

## Step 7 — Verify

`node scripts/check.mjs` must exit 0. It runs all seven structural validators, a commit-convention gate, and `git diff --check`. Fix in this order: JSON syntax -> router parity -> trigger-first/budget -> manifest drift -> README/tree counts.

## Working rhythm

One repo at a time, exhaustively. Track progress in `.pi/foundations.md` (batches of five: pending -> done). A batch is complete when its skills are written, wired, and the check is green.
