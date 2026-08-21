# Foundations Workflow — Wiring & Verification

The exact edits to register a foundation skill, the gates that must pass, and the failures to expect.

## Wiring (four edits + one regeneration)

### 1. `.pi/skills/packs.json`
- Add the member to `pack-foundations.members` (alphabetical is conventional).
- Add a `_descriptions["<name>"]` entry mirroring the frontmatter description (human-maintained routing hint; not validator-enforced but kept in sync).
- Careful: JSON comma slips here break `sync-skill-manifest.mjs` with `Expected ',' or '}'`.

### 2. `.pi/skills/pack-foundations/SKILL.md` (the router)
- Add the member line: `- <name>: <short description>`.
- The router's member list must equal packs.json members exactly (validator checks both directions).
- Total router text must stay under 190 words — compact other lines if needed.

### 3. Manifest
- `node scripts/sync-skill-manifest.mjs` regenerates `.pi/skills/manifest.json` from packs.json + disk.
- CI runs it with `--check`; drift fails.

### 4. `README.md` counts (three places + wording)
- Line ~5: `9 prompt commands, N skill files`.
- Line ~6: `(L leaves in P packs: L-4 pack leaves + 4 core safety), 12 format templates`.
- Line ~31 tree comment: `N skill files: P pack routers + (L-4) pack leaves + 4 core safety`.
- Line ~80: `N skill files — P pack routers, (L-4) hidden pack leaves, and 4 core safety skills` + the spelled-out router-count sentence (`Ten/Eleven visible pack routers (...)`).
- Math: skill files = routers + leaves; leaves = pack leaves + 4 core. Verify against `validate-release-hygiene.mjs` output (`tracked=... skills=N (leaves=L, packs=P)`).

### 5. Backlog
- Mark the repo done in `.pi/foundations.md` (batch tables: pending -> done) and queue the next batch.

## The gates

`node scripts/check.mjs` runs, in order:
1. `validate-skill-packs.mjs` — membership, visibility, trigger-first/budget, parity, manifest drift, router budget. Prints `[ok] packs=P members=M core=4 leaves=L routers=R visible=V ...`.
2. `sync-skill-manifest.mjs --check` — manifest currency.
3. `probe-skill-routing.mjs` — routing cases (add one for new foundation skills: task -> expected leaf, keyword present in its description).
4. `validate-pi-fabric.mjs` — fabric.json config, AGENTS.md contract, prompt Schema tokens, ship.md skill refs.
5. `validate-work-management.mjs` — work-record contract, prompt path ownership.
6. `validate-notion-workspace-skill.mjs`, `validate-release-hygiene.mjs` — README/tree counts, secrets scan.
7. `git diff --check` + commit-convention gate.

## Common failures -> fixes

| Failure | Fix |
|---|---|
| `Expected ',' or '}' after property value` in packs.json | missing comma after the previous `_descriptions` entry |
| `router "pack-foundations" omits catalog members` | add the member line to the router |
| `README skill files mismatch (README: N; tree: M)` | recount: files = routers + leaves; bump all README spots |
| `description must be trigger-first` / over budget | rewrite to `Use when ...`, <= 240 chars |
| `manifest drift` | run sync-skill-manifest.mjs |
| `unsafe description frontmatter: unquoted ": "` | wrap the description in double quotes |
| word-count warn on a foundation leaf | expected for deep leaves; move nothing — depth lives in references/, warnings on other leaves mean their SKILL.md grew |

## Adding a routing probe (optional but recommended)

In `scripts/probe-skill-routing.mjs`, add:

```js
{ task: "<one-session phrasing of the need>", expect: ["<leaf>"], keywords: ["<word from its description>"], max: 1 },
```

The probe lowercases the description and requires the keyword; keep one keyword per expected leaf.

## Red flags

- Editing packs.json by hand without regenerating the manifest.
- A router line whose description diverges from the leaf's purpose.
- Forgetting the README router-count wording (only the numbers get caught).
- Committing before check.mjs exits 0.
