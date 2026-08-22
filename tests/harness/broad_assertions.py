"""Broad assertion helpers — target the TYPE of bug, not one instance.

From the test/gate methodology: a test must be BROAD, catching the class of
bug/gap/issue rather than a single case. These helpers make it easy to assert
on properties that hold across many inputs, so one test covers many cases.

Also: a test is only good if it CATCHES — use these with the un-fixed and
fixed versions of code (pre-fix should fail, post-fix should pass).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any


def assert_all_satisfy(items: Iterable[Any], predicate: Callable[[Any], bool], label: str = "item") -> None:
    """Assert every item satisfies the predicate.

    Broad: catches any item that violates the invariant, not one specific case.
    """
    failures = [it for it in items if not predicate(it)]
    assert not failures, f"{len(failures)} {label}(s) failed the predicate: {failures[:5]}..."


def assert_no_duplicates(items: Iterable[Any], key: Callable[[Any], Any] | None = None, label: str = "item") -> None:
    """Assert no duplicate items (by identity or a key function).

    Broad: catches any duplicate, including near-identical ones.
    """
    seen: set[Any] = set()
    dupes: list[Any] = []
    for it in items:
        k = key(it) if key else it
        if k in seen:
            dupes.append(it)
        else:
            seen.add(k)
    assert not dupes, f"duplicates found: {dupes[:5]}..."


def assert_all_distinct_enough(
    items: Iterable[Any],
    similarity: Callable[[Any, Any], float],
    threshold: float = 0.9,
    label: str = "item",
) -> None:
    """Assert no two items are near-identical (semantic duplicate detection).

    `similarity(a, b)` returns a float in [0,1]; pairs above `threshold` are
    flagged. Broad: catches near-duplicates, not just exact ones.
    """
    items = list(items)
    near: list[tuple[Any, Any]] = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if similarity(items[i], items[j]) > threshold:
                near.append((items[i], items[j]))
    assert not near, f"near-duplicate {label}s: {near[:3]}..."


def assert_no_unused(items: Iterable[Any], is_used: Callable[[Any], bool], label: str = "item") -> None:
    """Assert every item is used (no dead/unused code, imports, etc.)."""
    unused = [it for it in items if not is_used(it)]
    assert not unused, f"unused {label}s: {unused[:5]}..."
