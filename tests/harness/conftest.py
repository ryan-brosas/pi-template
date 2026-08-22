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
