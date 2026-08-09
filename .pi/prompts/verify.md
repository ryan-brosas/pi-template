---
description: Verify the current work against the spec and gates before claiming completion
argument-hint: "[--full]"
---

# Verify: $ARGUMENTS

Verify the current work against the spec and the project gates, and report readiness.
> **Workflow:** `/ship` → **`/verify`**

## Read-only

This command is read-only: it runs gates, checks completeness, and reports. It never edits code.

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| `--full` | false | Run all gates in full mode (not incremental) |

## Phase 0: Check Verification Cache

If a recent verification is still valid (same commit + diff fingerprint), report a cached PASS and skip to Phase 2.

```bash
CURRENT_STAMP=$(printf '%s\n%s' "$(git rev-parse HEAD)" "$(git diff HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.go' '*.rs')" | shasum -a 256 | cut -d' ' -f1)
LAST_STAMP=$(tail -1 .pi/artifacts/verify.log 2>/dev/null | awk '{print $1}')
```

| Condition | Action |
| --- | --- |
| `--no-cache` or `--full` | Skip cache check, run fresh |
| `CURRENT_STAMP == LAST_STAMP` | Report cached PASS, skip to Phase 2 |
| otherwise | Run gates normally |

## Phase 1: Gather Context

Read `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` to understand the requirements.

**Verify guards:**
- [ ] Plan/spec exists and is up to date
- [ ] You have read the full spec

## Phase 2: Completeness Matrix

Extract all requirements/tasks from the PRD and verify each is implemented:
- For each requirement, find evidence in the codebase (file:line reference)
- Mark as: complete, partial, or missing
- Report completeness score (X/Y requirements met)

Do not flag a requirement as missing without searching for its implementation first.

## Phase 3: Correctness

Follow the verification protocol: `.pi/skills/verification-before-completion/references/VERIFICATION_PROTOCOL.md`.

**Default: incremental mode** (changed files only). Use `--full` for all files.

**Execution order:**
1. Typecheck + lint (parallel)
2. Test, then build (sequential, after the parallel passes)

For browser/manual local-web requirements, use stable URLs as verification evidence. A reachable URL supplements, but never replaces, typecheck/lint/test/build evidence.

Report results with a mode column:
```text
| Gate      | Status | Mode        | Time   |
|-----------|--------|-------------|--------|
| Typecheck | PASS   | full        | 2.1s   |
| Lint      | PASS   | incremental | 0.3s   |
| Test      | PASS   | incremental | 1.2s   |
| Build     | SKIP   | —           | —      |
```

**Inspecting output matters:** "0 tests run", "all skipped", and "compiled with warnings" are not passes. Read the exit code and the output tail.

**After all gates pass**, record to the verification cache:
```bash
echo "$CURRENT_STAMP $(date -u +%Y-%m-%dT%H:%M:%SZ) PASS" >> .pi/artifacts/verify.log
```

## Phase 4: Coherence (skip with --quick)

Cross-reference artifacts for contradictions:
- PRD vs implementation (does code address all PRD requirements?)
- Plan vs implementation (did code follow the plan?)
- Research recommendations vs actual approach (if different, is it justified?)

Flag contradictions with specific file references.

## Phase 5: Local vs Live

Separate what was verified locally from what still needs confirmation on live servers:
- Name the servers and flags that must be checked before deployment.
- A local pass does not imply a live pass; label unverified claims as unconfirmed.

## Phase 6: Report (output contract)

Append to `.pi/artifacts/$(cat .pi/artifacts/.active)/progress.md`: `Verification: [PASS|PARTIAL|FAIL] - [summary]`.

Output:
1. **Result**: READY TO SHIP / NEEDS WORK / BLOCKED
2. **Completeness**: score and status
3. **Correctness**: gate results (with mode column)
4. **Coherence**: contradictions found (if not --quick)
5. **Local vs live**: what is verified locally, what must be checked on a server
6. **Blocking issues** to fix before shipping
7. **Next step**: `/ship $ARGUMENTS` if ready, or list fixes needed

Record significant findings in context files:
```bash
# Append to .pi/artifacts/MEMORY.md:
#   - YYYY-MM-DD: [scope] [key finding] — [what, impact, resolution]
# Put under the Decisions or Gotchas section as appropriate
```

## Prewalk boundary

Verification is read-only: running gates and appending to progress files is
allowed only after the active checklist handoff permits it. Any remediation
requires its own accepted `prewalk.checklist({ items, schema })` before edits.

## Related Commands

| Need | Command |
| --- | --- |
| Ship after verify | `/ship <id>` |
| Plan a feature | `/plan` |
| Fix a bug | `/fix` |
