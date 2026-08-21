# OpenCode — Snapshot / Undo Reference

Source-grounded reference for `packages/opencode/src/snapshot/index.ts` (807 lines, ~45% read incl. all core paths). Effect-TS service.

## WHAT: a SHADOW GIT REPO per worktree, for AI-edit undo

Every AI edit session can be rolled back: a hidden git repo lives in global data (`~/.opencode`-style) keyed `snapshot/<projectId>/<hash(worktree)>`, with `--work-tree` pointed at the REAL worktree. Sessions track before-states and revert via patches.

## WHERE
Config/constants :26-33 (`prune="7.days"`, `limit=2MB`, longpaths/symlinks/autocrlf flags), state+git wrapper :66-90, ignore sync :118-146, object-database seeding :148-186, add :188-260, cleanup :262-281, track :283+.

## WHY each design decision

- **Shadow repo, not stashes or copies**: git gives content-addressed storage, cheap diffs, and patch extraction for free; keyed per worktree hash so multiple checkouts don't collide.
- **Object-database SHARING via alternates** (:148-186): on huge repos (comment names chromium), `git add --all` re-hashing blobs takes MINUTES. The shadow repo writes the source repo's `objects` dir into its own `info/alternates` (chaining the source's OWN alternates, skipping missing ones) AND seeds the source index file — "eliminating this at all." Best-effort: incompatible index falls back to full add.
- **Newly-ignored files are DROPPED, not just skipped** (:236-243): if a file becomes gitignored between snapshots it's `rm --cached` from the shadow index to prevent re-adding. `check-ignore --no-index` keeps evaluation PATTERN-BASED even for already-tracked paths; leading `:` pathspec magic protected with a `./` prefix (:120-121 comment).
- **Large files excluded from snapshots** (>2MB, stat concurrency 8) by syncing them into the shadow repo's info/exclude — untracked large files never enter.
- **NUL-delimited pathspec files with `:(top,literal)` magic** (:78-80): filenames with glob characters or newlines survive; top-literal prevents pathspec interpretation relative to cwd.
- **Semaphore per gitdir** (:68-75): concurrent sessions sharing one worktree serialize snapshot mutations.
- **gc --prune=7.days** on cleanup bounds shadow growth; every git failure degrades to logWarning — undo infrastructure must never break the actual task.

## HOW track/revert work

- `track()` (pre-edit): init shadow repo on first use (config: autocrlf false, longpaths true, symlinks true), sync excludes, then `add --all --sparse --pathspec-from-file=- --pathspec-file-nul` of tracked-modified ∪ untracked-not-ignored minus oversized. Returns a hash marking the state.
- Revert applies extracted patches (`formatPatch`/`structuredPatch` from the diff lib) in reverse; `diffFull` powers UI file diffs via the schema `FileDiff` type.
- Enabled only when project vcs == git AND config `snapshot !== false`.

## The lessons
1. Undo for AI edits = shadow VCS with shared object storage — reuse, never re-hash.
2. Ignore-rule drift needs ACTIVE correction (drop from index), not just filtering.
3. Every snapshot failure is non-fatal by contract; the user's task outranks the safety net.
