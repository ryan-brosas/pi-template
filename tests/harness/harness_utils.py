"""Portable test utilities farmed from pydantic-ai's test suite.

These are the reusable, dependency-free patterns (adapted to be standalone —
no pydantic-ai imports). Stack your leverage: reuse these instead of writing
them from scratch.
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable, Generator, Iterator
from contextlib import contextmanager
from typing import Any

import pytest


@contextmanager
def try_import() -> Generator[Callable[[], bool]]:
    """Gracefully handle optional imports in tests.

    Wrap an import block; if it raises ImportError (optional dependency
    missing), the test continues and check_import() returns False. If the
    import succeeds, check_import() returns True. Lets a test skip cleanly
    when an optional dependency is absent instead of erroring.

    Usage:
        with try_import() as has_import:
            import optional_lib
        if not has_import():
            pytest.skip("optional_lib not installed")
    """
    import_success = False

    def check_import() -> bool:
        return import_success

    try:
        yield check_import
    except ImportError:
        pass
    else:
        import_success = True


@pytest.fixture(scope="session", autouse=True)
def event_loop() -> Iterator[None]:
    """Provide a session-scoped asyncio event loop."""
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    yield
    new_loop.close()


def raise_if_exception(e: Any) -> None:
    """Re-raise if the value is an Exception (used with mock results)."""
    if isinstance(e, Exception):
        raise e


# Proxy isolation (from openai-agents-python conftest): keeps tests independent
# from host proxy configuration so HTTP tests are hermetic/deterministic.
_PROXY_ENVIRONMENT_VARIABLES = (
    "ALL_PROXY",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "all_proxy",
    "http_proxy",
    "https_proxy",
)
_PROXY_OPT_IN_ENVIRONMENT_VARIABLE = "HERMES_TEST_USE_PROXY"


def remove_ambient_proxy_environment() -> None:
    """Remove ambient proxy env vars so unit tests don't depend on host proxy config.

    Call in a conftest or fixture setup. An opt-in env var re-enables the proxy
    when explicitly wanted.
    """
    import os

    if os.environ.get(_PROXY_OPT_IN_ENVIRONMENT_VARIABLE, "").lower() in {
        "1",
        "true",
        "yes",
    }:
        return
    for var in _PROXY_ENVIRONMENT_VARIABLES:
        os.environ.pop(var, None)
