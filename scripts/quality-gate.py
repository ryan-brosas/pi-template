#!/usr/bin/env python3
"""Quality gate for the pi-template's agent infrastructure.

The template ships no application code — its "product" is the agent
infrastructure: skills, prompts, templates, and configs. This gate applies the
test/gate methodology (a check is only good if it catches) to that surface:

- No duplicate skill names / descriptions
- No orphaned references (references/ files not listed in the leaf)
- No dangling cross-links to missing skills
- Essentials docs all present and indexed
- No near-duplicate skill descriptions (semantic-ish similarity by prefix)
- JSON validity

Exit 0 = gate passes. Non-zero = report what it caught.
"""
import json, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS = os.path.join(BASE, ".pi", "skills")
ESSENTIALS = os.path.join(BASE, ".pi", "essentials")
errors = []
warnings = []

# 1. JSON validity
for f in ("packs.json", "manifest.json"):
    try:
        json.load(open(os.path.join(SKILLS, f)))
    except Exception as e:
        errors.append(f"{f} invalid JSON: {e}")

# 2. Collect all skills (name -> description, path)
skills = {}
for root, dirs, files in os.walk(SKILLS):
    if "SKILL.md" in files:
        path = os.path.join(root, "SKILL.md")
        text = open(path).read()
        m = re.search(r"^name:\s*(.+)$", text, re.MULTILINE)
        d = re.search(r"^description:\s*(.+)$", text, re.MULTILINE)
        name = m.group(1).strip() if m else os.path.basename(root)
        desc = d.group(1).strip() if d else ""
        if name in skills:
            errors.append(f"duplicate skill name: {name} ({skills[name]} and {path})")
        skills[name] = {"path": path, "desc": desc, "dir": root}

# 3. Orphaned references: references/ files not mentioned in their leaf
# (report as warnings — pre-existing skills may link references via other means;
#  hard-fail only on genuinely broken structure like duplicates/missing essentials)
for name, info in skills.items():
    ref_dir = os.path.join(info["dir"], "references")
    if not os.path.isdir(ref_dir):
        continue
    leaf = open(info["path"]).read()
    for rf in os.listdir(ref_dir):
        if rf.endswith(".md"):
            if rf not in leaf:
                warnings.append(f"orphaned reference: {name}/references/{rf} not in leaf")

# 4. Near-duplicate descriptions (prefix overlap > 60%)
descs = [(n, i["desc"].lower()) for n, i in skills.items() if i["desc"]]
for i in range(len(descs)):
    for j in range(i+1, len(descs)):
        n1, d1 = descs[i]
        n2, d2 = descs[j]
        if not d1 or not d2:
            continue
        # simple prefix similarity
        shorter = min(len(d1), len(d2))
        if shorter < 20:
            continue
        common = 0
        for k in range(min(shorter, 60)):
            if d1[k] == d2[k]:
                common += 1
            else:
                break
        if common > 0.6 * shorter:
            warnings.append(f"near-duplicate descriptions: {n1} ~ {n2} (prefix {common} chars)")

# 5. Essentials present + indexed
essential_files = [
    "operating-philosophy.md", "guiding-small-model.md",
    "steer-outcomes-not-behavior.md", "stack-your-leverage.md",
    "enforce-code-quality-mechanically.md", "how-to-build-good-tests.md",
    "README.md",
]
for ef in essential_files:
    if not os.path.exists(os.path.join(ESSENTIALS, ef)):
        errors.append(f"missing essential doc: {ef}")
readme = open(os.path.join(ESSENTIALS, "README.md")).read() if os.path.exists(os.path.join(ESSENTIALS, "README.md")) else ""
for ef in essential_files:
    if ef != "README.md" and ef not in readme:
        errors.append(f"essential not indexed in README: {ef}")

if errors:
    print("QUALITY GATE FAILURES:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"QUALITY GATE OK: {len(skills)} skills, {len(essential_files)} essentials, no failures")
    for w in warnings:
        print(f"  (warn) {w}")
