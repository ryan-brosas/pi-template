---
name: practices-to-ci
description: "Use when a repo has code practices/discipline that should be enforced automatically — turn them into mechanical CI checks instead of relying on prompting or prose rules."
disable-model-invocation: true
---

# Practices to CI

Turn code practices and discipline into mechanically-enforced CI checks. This
is the "steer outcomes, not behavior" principle (Pillar 2) made concrete: don't
prompt for behavior, enforce it with checks.

## The principle

- **Anything mechanical/predictable/deterministic → a CI check.** (Pillar 4)
- **"Prompting for something mechanically enforceable is useless."** Use gates
  that can't be bypassed.
- A restriction is a conclusion you earn from a real failure — the CI check
  proves the practice holds.

## What to turn into checks

From the pre-commit configs of high-quality repos:

| Practice | CI check |
|---|---|
| No trailing whitespace | grep `[ \t]+$` |
| Files end with newline | check last byte is `\n` |
| No smart quotes/ligatures | scan for `\u201c\u201d\u2018\u2019\ufb01\ufb02` |
| No large files | `os.path.getsize` > threshold |
| Valid YAML/JSON/TOML | parse each |
| No typos | lightweight codespell dictionary |
| No direct commits to main | `no-commit-to-branch` |
| No secrets committed | scan for key patterns / use gitleaks |
| No dead/unused code | lint (ruff/knip/eslint) |

## How to apply

1. **Identify the practice** the repo wants to enforce (from AGENTS.md, pre-commit
   config, or code discipline).
2. **Write a check script** (`scripts/*.py`) that mechanically verifies it and
   exits non-zero on failure.
3. **Wire it into CI** (`.github/workflows/*.yml`) so it runs on PRs/pushes.
4. **Upload failure logs as artifacts** so failures are debuggable.
5. **Fix what it catches** — a check that finds nothing is untested; verify it
   catches a real violation (test the un-fixed version).

## The pi-template's checks

- `check-integrity.py` — pack/member/router/manifest parity
- `quality-gate.py` — skill/essentials quality (duplicates, orphans)
- `repo-hygiene.py` — trailing whitespace, EOF newline, smart quotes, large
  files, mixed line endings, YAML/JSON/TOML validity, typos, secrets scan,
  forbid-submodules
- `.pre-commit-config.yaml` — local pre-commit enforcement (no-commit-to-branch,
  yaml/toml, eof-fixer, trailing-whitespace, large files, codespell) + runs
  repo-hygiene

## When to use

Use when a repo has a practice that "should be followed" but isn't enforced —
turn it into a check rather than adding a prose rule. This complements
`ci-best-practices` (how to write good workflows) and `code-discipline` (the
practices themselves).
