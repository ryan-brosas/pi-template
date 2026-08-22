#!/usr/bin/env python3
"""Structural integrity check for the pi-template skill catalog.

Verifies the template's self-consistency so CI can steer outcomes:
- packs.json and manifest.json are valid JSON
- every pack member in packs.json resolves to an on-disk skill directory
- every retained member in manifest.json resolves to an on-disk skill
- every pack router (pack-*/SKILL.md) lists exactly the members in packs.json
- no dangling script/canonical-check references in live config files

Exit 0 = consistent. Non-zero = report the drift.
"""
import json, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS = os.path.join(BASE, ".pi", "skills")
errors = []

def skill_dir(name):
    # find a skill dir by name anywhere under .pi/skills
    for root, dirs, files in os.walk(SKILLS):
        if os.path.basename(root) == name and "SKILL.md" in files:
            return root
    return None

# 1. JSON validity
for f in ("packs.json", "manifest.json"):
    p = os.path.join(SKILLS, f)
    try:
        json.load(open(p))
    except Exception as e:
        errors.append(f"{f} invalid JSON: {e}")

# 2. pack members resolve
packs = json.load(open(os.path.join(SKILLS, "packs.json")))
for pack in packs.get("packs", []):
    pid = pack["id"]
    for m in pack.get("members", []):
        if not os.path.isdir(os.path.join(SKILLS, pid, m)):
            errors.append(f"pack member missing: {pid}/{m}")

# 3. manifest retained members resolve
manifest = json.load(open(os.path.join(SKILLS, "manifest.json")))
for entry in manifest.get("retained", []):
    name = entry.get("name")
    if name and not skill_dir(name):
        errors.append(f"manifest retained missing: {name}")

# 4. router parity (pack router lists exactly the packs.json members)
for pack in packs.get("packs", []):
    pid = pack["id"]
    router = os.path.join(SKILLS, pid, "SKILL.md")
    if not os.path.exists(router):
        errors.append(f"no router: {pid}")
        continue
    rt = open(router).read()
    router_members = set()
    for line in rt.splitlines():
        line = line.strip()
        if line.startswith("- ") and not line.startswith("##"):
            name = line[2:].split(":")[0].strip()
            if name and not name.startswith("#"):
                router_members.add(name)
    catalog_members = set(pack.get("members", []))
    if catalog_members != router_members:
        errors.append(
            f"router mismatch {pid}: catalog-only={sorted(catalog_members-router_members)} "
            f"router-only={sorted(router_members-catalog_members)}"
        )

# 5. no dangling script/canonical-check refs in live config
# (skip historical changelog lines in state.md which record past events)
live = ["fabric.json", "tech-stack.md", "project.md"]
for f in live:
    p = os.path.join(BASE, ".pi", f)
    if not os.path.exists(p):
        continue
    t = open(p).read()
    if re.search(r"scripts/[a-z0-9-]+\.mjs", t):
        errors.append(f"{f} references a scripts/*.mjs that does not exist")
    if "canonical-check" in t:
        errors.append(f"{f} references canonical-check trusted command")

# state.md: only scan the gates table (before the changelog), not historical rows
sp = os.path.join(BASE, ".pi", "state.md")
if os.path.exists(sp):
    st = open(sp).read()
    # take only the section before the changelog (rows with a date in col 1 are historical)
    live_state_lines = []
    for line in st.splitlines():
        # skip changelog rows (start with a date like "| 2026-")
        if line.strip().startswith("| 2026-"):
            continue
        live_state_lines.append(line)
    live_state = "\n".join(live_state_lines)
    if re.search(r"scripts/[a-z0-9-]+\.mjs", live_state):
        errors.append("state.md (live section) references a scripts/*.mjs that does not exist")
    if "canonical-check" in live_state:
        errors.append("state.md (live section) references canonical-check trusted command")

if errors:
    print("STRUCTURAL INTEGRITY FAILURES:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"OK: {len(packs.get('packs', []))} packs, all consistent")
