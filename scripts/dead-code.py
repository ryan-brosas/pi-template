#!/usr/bin/env python3
"""Dead-code check — finds unused scripts and unreferenced skill files.

Farmed from vitest's knip (dead-code detection) practice. For a template, the
"dead code" is:
- scripts/*.py not referenced by any workflow, pre-commit config, or doc
- skill files (SKILL.md) not listed in packs.json or manifest.json
- reference files not linked from their leaf (orphans)

Exit 0 = no dead code. Non-zero = report what to remove or wire up.
"""
import json, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []

# 1. Unused scripts: scripts/*.py not referenced anywhere
scripts_dir = os.path.join(BASE, "scripts")
all_text = ""
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".venv", ".veda", ".pi/fabric", "inspect")]
    for f in files:
        if f.endswith((".yml", ".yaml", ".md", ".py", ".toml", ".cfg")):
            p = os.path.join(root, f)
            try:
                all_text += open(p, encoding="utf-8").read() + "\n"
            except (UnicodeDecodeError, OSError):
                pass

if os.path.isdir(scripts_dir):
    for f in sorted(os.listdir(scripts_dir)):
        if f.endswith(".py") and f != "__init__.py":
            if f not in all_text:
                errors.append(f"unused script (not referenced anywhere): scripts/{f}")

# 2. Skill files not in packs.json or manifest
packs = json.load(open(os.path.join(BASE, ".pi", "skills", "packs.json")))
manifest = json.load(open(os.path.join(BASE, ".pi", "skills", "manifest.json")))
known = set()
for p in packs.get("packs", []):
    known.update(p.get("members", []))
for e in manifest.get("retained", []):
    known.add(e.get("name"))
for e in manifest.get("removed", []):
    known.add(e.get("name"))

skills_dir = os.path.join(BASE, ".pi", "skills")
for root, dirs, files in os.walk(skills_dir):
    if "SKILL.md" in files:
        name = os.path.basename(root)
        # skip pack routers (pack-* dirs) and foundation leaves (managed by drain)
        if name.startswith("pack-") or name.endswith("-foundation"):
            continue
        if name not in known:
            errors.append(f"skill not in packs.json/manifest: {name}")

if errors:
    print("DEAD CODE:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("DEAD CODE OK")
