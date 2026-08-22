#!/usr/bin/env python3
"""Repo-hygiene check — mechanically enforces code-discipline practices.

Turns the pre-commit practices farmed from high-quality repos into a single
checkable gate:
- no trailing whitespace
- files end with a newline (EOF fixer)
- no smart quotes / ligatures (use plain ASCII in code/config)
- no large files (default >1MB)
- YAML / JSON / TOML validity
- no common typos (lightweight codespell)

Exit 0 = clean. Non-zero = report what to fix.
"""
import json, os, re, sys, glob

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_KB = 1024  # 1MB
errors = []

TEXT_EXT = {".md", ".json", ".yml", ".yaml", ".py", ".mjs", ".ts", ".toml", ".txt", ".sh"}

# Common typo dictionary (lightweight codespell)
TYPO_MAP = {
    "recieve": "receive", "seperate": "separate", "occured": "occurred",
    "teh": "the", "adress": "address", "definately": "definitely",
    "untill": "until", "wich": "which", "thier": "their", "recieve": "receive",
    "compatability": "compatibility", "dependancy": "dependency",
    "enviroment": "environment", "existance": "existence", "fucntion": "function",
    "paramter": "parameter", "retrun": "return", "wether": "whether",
}

def walk():
    # skip generated/runtime state that isn't authored code
    SKIP_DIRS = {".git", "node_modules", ".venv", "site-packages", ".bak",
                 ".veda", ".pi/fabric", ".pi/artifacts", "inspect", ".pi/hindsight"}
    for root, dirs, files in os.walk(BASE):
        rel = os.path.relpath(root, BASE)
        rel = "" if rel == "." else rel
        dirs[:] = [d for d in dirs
                   if os.path.join(rel, d) not in SKIP_DIRS and not d.endswith(".bak")]
        for f in files:
            if f.endswith(".bak") or f.endswith(".jsonl"):
                continue
            yield os.path.join(root, f)

def check_file(path):
    rel = os.path.relpath(path, BASE)
    ext = os.path.splitext(path)[1].lower()

    # large files
    try:
        size_kb = os.path.getsize(path) / 1024
        if size_kb > MAX_KB:
            errors.append(f"large file ({size_kb:.0f}KB > {MAX_KB}KB): {rel}")
    except OSError:
        pass

    if ext not in TEXT_EXT:
        return
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, OSError):
        return

    # mixed line endings (CRLF + LF in same file)
    if "\r\n" in content and "\n" in content.replace("\r\n", ""):
        errors.append(f"mixed line endings: {rel}")

    # trailing whitespace
    for i, line in enumerate(content.splitlines(), 1):
        if line != line.rstrip():
            errors.append(f"trailing whitespace: {rel}:{i}")
            break

    # EOF newline
    if content and not content.endswith("\n"):
        errors.append(f"missing EOF newline: {rel}")

    # smart quotes / ligatures
    for ch, name in [("\u201c", "smart quote"), ("\u201d", "smart quote"),
                      ("\u2018", "smart quote"), ("\u2019", "smart quote"),
                      ("\ufb01", "ligature fi"), ("\ufb02", "ligature fl")]:
        if ch in content:
            errors.append(f"{name} in {rel}")
            break

    # JSON validity
    if ext == ".json":
        try:
            json.loads(content)
        except Exception as e:
            errors.append(f"invalid JSON: {rel}: {e}")

    # TOML validity
    if ext == ".toml":
        try:
            import tomllib
            tomllib.loads(content)
        except Exception as e:
            errors.append(f"invalid TOML: {rel}: {e}")

    # secrets scan (lightweight): common secret patterns in code/config
    if ext in (".py", ".mjs", ".ts", ".json", ".yml", ".yaml", ".toml", ".env"):
        secret_patterns = [
            (r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]", "possible secret"),
            (r"sk-[A-Za-z0-9]{20,}", "OpenAI-style key"),
            (r"ghp_[A-Za-z0-9]{20,}", "GitHub token"),
            (r"AKIA[0-9A-Z]{16}", "AWS access key"),
        ]
        for pat, label in secret_patterns:
            if re.search(pat, content):
                errors.append(f"{label} in {rel}")
                break

    # typos (only in prose-ish files, skip code to avoid false positives)
    if ext in (".md", ".txt"):
        for word, fix in TYPO_MAP.items():
            if re.search(rf"\b{word}\b", content, re.IGNORECASE):
                errors.append(f"typo '{word}' (should be '{fix}'): {rel}")
                break

# YAML validity (best-effort; pyyaml may not be present)
try:
    import yaml
    for path in glob.glob(f"{BASE}/.github/workflows/*.yml") + glob.glob(f"{BASE}/.pi/**/*.yml", recursive=True):
        try:
            with open(path, encoding="utf-8") as f:
                yaml.safe_load(f)
        except Exception as e:
            errors.append(f"invalid YAML: {os.path.relpath(path, BASE)}: {e}")
except ImportError:
    pass

# forbid git submodules
if os.path.exists(os.path.join(BASE, ".gitmodules")):
    errors.append("git submodules are forbidden (.gitmodules present)")

for path in walk():
    check_file(path)

if errors:
    print("REPO HYGIENE FAILURES:")
    for e in errors[:50]:
        print(f"  - {e}")
    print(f"  ... {len(errors)} total")
    sys.exit(1)
else:
    print("REPO HYGIENE OK")
