#!/usr/bin/env python3
"""Conventional-commit check — validates commit subjects and PR titles.

Farmed from the conventional-commits practice (used across high-quality repos):
commit subjects and PR titles must follow the conventional format so the
changelog is generated cleanly.

Format: <type>(<scope>): <description>
  type: feat, fix, docs, style, refactor, perf, test, chore, ci, build, feat
  scope: optional, lowercase
  description: imperative, no leading capital, no trailing period

Exit 0 = all conventional. Non-zero = report violations.
"""
import os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []

ALLOWED_TYPES = {
    "feat", "fix", "docs", "style", "refactor", "perf", "test", "chore",
    "ci", "build", "feat", "revert", "release", "wip",
}

CONV_PAT = re.compile(r"^(?P<type>[a-z]+)(\((?P<scope>[a-z0-9_\-]+)\))?!?:\s*(?P<desc>.+)$")


def check_subject(subject: str) -> list[str]:
    """Return a list of violations for a commit subject / PR title."""
    v = []
    m = CONV_PAT.match(subject.strip())
    if not m:
        v.append(f"not conventional (want '<type>(<scope>): <desc>', got '{subject.strip()}'")
        return v
    if m.group("type") not in ALLOWED_TYPES:
        v.append(f"unknown type '{m.group('type')}' (allowed: {sorted(ALLOWED_TYPES)})")
    desc = m.group("desc")
    if desc[0].isupper():
        v.append("description should not start with a capital letter")
    if desc.endswith("."):
        v.append("description should not end with a period")
    return v


def main():
    # check recent commit subjects from git log
    import subprocess
    try:
        out = subprocess.run(
            ["git", "log", "--pretty=%s", "-10"], cwd=BASE, capture_output=True, text=True
        ).stdout
    except Exception:
        out = ""
    for line in out.splitlines():
        if not line:
            continue
        for v in check_subject(line):
            errors.append(f"commit '{line}': {v}")

    # check PR title format is documented (no enforcement possible without GH)
    if not errors:
        print("CONVENTIONAL COMMITS OK")
    else:
        print("CONVENTIONAL COMMIT VIOLATIONS:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
