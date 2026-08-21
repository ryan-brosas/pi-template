# Localterm — Git Diff Reference

The git diff pipeline surfaced in the terminal UI: `packages/server/src/git-diff-{service,parser,cache,watcher}.ts` + `git-branch-metadata.ts` + `apps/harness/light-theme-rendering/reverse-unified-patch.mjs`.

## The diff service (`git-diff-service.ts`)

- Modes: `working` (uncommitted) vs committed (base ref).
- Constants (from `constants.ts`): `GIT_BINARY_SNIFF_BYTES`, `GIT_DIFF_FILE_CONTENT_MAX_BYTES`, `GIT_EMPTY_TREE_HASH`, `GIT_MAX_PATCH_BYTES_PER_FILE`, `GIT_MAX_TOTAL_PATCH_BYTES`, `GIT_MAX_UNTRACKED_FILE_BYTES`, `GIT_MAX_UNTRACKED_FILES`, `GIT_MAX_UNTRACKED_TOTAL_BYTES`, `GIT_UNTRACKED_PATHS_MAX_BYTES`.
- Uses `getCurrentBranch`, `isGitRepo`, `resolveDefaultBase`, `verifyRef` (git-branch-metadata) + `runGit` (fan-in 26).
- **Untracked files**: builds patches for them via `buildUntrackedPatch`; caps count/bytes/total.
- Caching via `readDiffCache`/`writeDiffCache` (git-diff-cache.ts).
- PR dedup via `detectPrDeduped`/`readPrCache` (github-pr.ts).

## The parser (`git-diff-parser.ts`)

- `countLines(text)` — counts newlines (+1 if no trailing newline).
- `buildUntrackedPatch(content)` — builds a valid `@@ -0,0 +1,N @@` hunk with `+`-prefixed lines and the `\ No newline at end of file` marker when needed.
- `splitPatchByFile(raw)` — splits a combined diff on `^(?=diff --git )`.
- `parseNumstatZ(raw)` — parses NUL-separated `--numstat -z` output, rename-aware (oldPath/newPath when 3 tokens), binary detection (`-` in either column).
- `parseNameStatusZ`, `indexPatchesByPath` — name-status + patch indexing.

## The watcher + cache

- `git-diff-watcher.ts` — watches the repo for changes to invalidate the diff cache.
- `git-diff-cache.ts` — the cache (read/write).
- `git-branch-metadata.ts` — branch metadata helpers.
- `git-worktrees.ts`, `git-metadata-coordinator.ts`, `git-diff-coordinator.ts` — worktrees + coordination.

## Reverse unified patch (`apps/harness/light-theme-rendering/reverse-unified-patch.mjs`)

`reverseUnifiedPatch(patchedSource, patchSource, filePath)` reverses a unified diff hunk by hunk:
- Parses hunk headers with `/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/`.
- Locates the `diff --git a/<path> b/<path>` block; slices to the next `diff --git`.
- Walks hunks: context (` `) and added (`+`) lines must match the patched source (throws `Patch mismatch at <file>:<line>: expected <content>` otherwise); context lines go into restored output, added lines are dropped, removed (`-`) lines are re-inserted.
- Appends the trailing un-hunked lines.
- Handles `\ No newline at end of file`.

## Red flags

- Reversing a patch without verifying context lines match (silent corruption).
- Building an untracked patch without the `\ No newline` marker (invalid diff).
- Ignoring the per-file/total patch byte caps (memory blowup on huge repos).
- Not caching + watching (recomputed diffs on every render).

## Verification

- `reverseUnifiedPatch` restores a file exactly and throws on mismatch.
- `buildUntrackedPatch` produces a valid hunk.
- `parseNumstatZ` handles renames and binary files.
- The watcher invalidates the cache on change.
