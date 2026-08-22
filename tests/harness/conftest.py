# Copyright (c) 2024 Microsoft Corporation.
# Licensed under the MIT License
# Farmed from graphrag's test conftest (--run_slow gating) and browser-harness
# (fake_png fixture for image/screenshot tests).

import base64
import io
import os
import sys

import pytest
from PIL import Image


def pytest_addoption(parser):
    parser.addoption(
        "--run_slow", action="store_true", default=False, help="run slow tests"
    )
    parser.addoption(
        "--stability-threshold",
        action="store",
        default=None,
        type=float,
        help="Minimum stability test pass rate (percent) required to exit 0 (default: disabled)",
    )


# Stability-threshold gating (from cuga-agent): lets flaky/load tests be gated
# on a minimum pass rate instead of all-or-nothing, while non-stability
# failures stay hard failures.
_stability_outcomes: dict[str, bool] = {}
_hard_failure = False


def pytest_sessionstart(session):
    global _stability_outcomes, _hard_failure
    _stability_outcomes = {}
    _hard_failure = False


def pytest_runtest_logreport(report):
    """Track one stability outcome per nodeid (tests marked 'stability')."""
    global _hard_failure
    keywords = getattr(report, "keywords", {})
    is_stability = "stability" in keywords

    if report.when == "call":
        if is_stability:
            _stability_outcomes[report.nodeid] = report.passed
        elif report.failed:
            _hard_failure = True
        return

    if not report.failed:
        return

    if is_stability:
        if report.when == "setup" and report.nodeid not in _stability_outcomes:
            _stability_outcomes[report.nodeid] = False
        elif report.when == "teardown":
            _hard_failure = True
        return

    _hard_failure = True


def pytest_sessionfinish(session, exitstatus):
    threshold = session.config.getoption("stability_threshold")
    if threshold is None or not _stability_outcomes:
        return

    passed = sum(_stability_outcomes.values())
    total = len(_stability_outcomes)
    pass_rate = 100.0 * passed / total
    print(f"\nStability pass rate: {pass_rate:.1f}% ({passed}/{total}), threshold: {threshold}%")

    if _hard_failure:
        session.exitstatus = 1
    elif pass_rate < threshold:
        session.exitstatus = 1


def make_png(width, height):
    """Generate a base64-encoded white PNG of the given dimensions."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), "white").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture
def fake_png():
    """Return a factory that generates fake base64 PNGs for image tests."""
    return make_png


# Project-root import setup (from graphiti conftest): lets tests import the
# project package without installing it.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Exclude subdirectories from test collection when they have their own suites.
# Add to this list as needed, e.g. collect_ignore_glob = ['subdir/*']


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Custom test summary: failing tests first, then counts, then verdict."""
    tr = terminalreporter
    passed = tr.stats.get("passed", [])
    failed = tr.stats.get("failed", [])
    skipped = tr.stats.get("skipped", [])
    ran = len(passed) + len(failed)
    tr.write_sep("=", "TEST SUMMARY")
    if failed:
        tr.write_line("FAILING TESTS:")
        for test in failed:
            tr.write_line(f"  FAIL  {test.nodeid}")
    tr.write_line(f"ran={ran} passed={len(passed)} failed={len(failed)} skipped={len(skipped)}")
    tr.write_line("VERDICT: " + ("PASS" if exitstatus == 0 else "FAIL"))


@pytest.fixture(autouse=True)
async def _cleanup_background_evaluations():
    """Drain background evaluation tasks after each test.

    Prevents leaked tasks from a failed test from affecting subsequent tests.
    """
    yield
    try:
        from pydantic_evals.online import wait_for_evaluations
    except ImportError:
        return
    await wait_for_evaluations()


# Conditional collection: ignore test modules when an optional dependency is
# missing, so slim CI runs don't fail on import. Add to this list as needed.
#   collect_ignore = ['test_x.py'] if importlib.util.find_spec('dep') is None else []
import importlib.util  # noqa: E402
