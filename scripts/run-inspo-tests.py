#!/usr/bin/env python3
"""Test harness for inspo repos — verify the foundations we use actually pass.

For each repo, install deps (into a venv) and run the test suite, reporting
PASS/FAIL/ERROR. This is the smoke check: we only build foundations on code
whose tests pass.

Usage:
  python3 scripts/run-inspo-tests.py [repo1 repo2 ...]   # specific repos
  python3 scripts/run-inspo-tests.py --all               # all python test repos
"""
import os, subprocess, sys, shutil

INSPO = "/mnt/hdd/utopia/inspo"
UV = "/home/utopia/.hermes/bin/uv"
RESULTS = {}

def run(cmd, cwd, timeout=600):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr)[-2000:]
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT"

def test_python_repo(name):
    path = os.path.join(INSPO, name)
    venv = os.path.join(path, ".venv")
    print(f"\n=== {name} ===")
    # create venv
    rc, out = run([UV, "venv", ".venv"], path, timeout=120)
    if rc != 0:
        RESULTS[name] = ("ERROR", f"venv failed: {out[-200:]}")
        return
    # install deps (editable, with test/dev extras if present)
    rc, out = run([UV, "pip", "install", "--python", f"{venv}/bin/python", "-e", ".[test]"], path, timeout=600)
    if rc != 0:
        rc, out = run([UV, "pip", "install", "--python", f"{venv}/bin/python", "-e", ".[dev]"], path, timeout=600)
    if rc != 0:
        rc, out = run([UV, "pip", "install", "--python", f"{venv}/bin/python", "-e", "."], path, timeout=600)
    # ensure pytest is present (some repos put it in a non-standard extra)
    rc, out = run([UV, "pip", "install", "--python", f"{venv}/bin/python", "pytest", "pytest-asyncio"], path, timeout=300)
    if rc != 0:
        RESULTS[name] = ("ERROR", f"install failed: {out[-300:]}")
        return
    # run pytest (ignore optional cloud-provider deps that fail at import)
    py = f"{venv}/bin/python"
    rc, out = run([py, "-m", "pytest", "-q", "--ignore=tests/embeddings", "--ignore=tests/llms"], path)
    if rc == 0:
        RESULTS[name] = ("PASS", out[-200:])
    elif rc == 5:  # no tests collected
        RESULTS[name] = ("NO TESTS", out[-200:])
    else:
        RESULTS[name] = ("FAIL", out[-300:])

def main():
    args = sys.argv[1:]
    if "--all" in args:
        targets = [d for d in os.listdir(INSPO) if os.path.isdir(os.path.join(INSPO, d))
                   and (os.path.exists(os.path.join(INSPO, d, "pyproject.toml"))
                        or os.path.exists(os.path.join(INSPO, d, "requirements.txt")))
                   and (os.path.isdir(os.path.join(INSPO, d, "tests"))
                        or os.path.isdir(os.path.join(INSPO, d, "test")))]
    else:
        targets = args
    for t in targets:
        test_python_repo(t)
    print("\n\n===== SUMMARY =====")
    for name, (status, detail) in RESULTS.items():
        print(f"  {name}: {status}")
    sys.exit(0 if all(s == "PASS" for _, (s, _) in RESULTS.items()) else 1)

if __name__ == "__main__":
    main()
