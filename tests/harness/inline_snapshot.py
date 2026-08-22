"""Lightweight inline-snapshot wrapper.

Uses cheap stubs by default so the heavy `inline_snapshot` library (AST
rewriting, startup overhead) doesn't slow test startup. Only loads the real
library when a `--inline-snapshot` / `--snap` flag is passed to pytest.

- `snapshot(value)` returns a proxy that compares using the value, warning on
  mismatch.
- `snapshot()` with no args raises, directing you to use `--inline-snapshot=create`.
- `Is(value)` compares using the underlying value.
- `customize` is a no-op decorator.
- `raises` / `warns` assert on formatted exception / warning text.
"""

from __future__ import annotations

import sys
import warnings
from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any
from warnings import catch_warnings, simplefilter

if TYPE_CHECKING:
    from inline_snapshot import Is as Is, snapshot as snapshot
    from inline_snapshot.extra import raises as raises, warns as warns
    from inline_snapshot.plugin import Builder as Builder, Custom as Custom, customize as customize
elif (
    any(arg.startswith("--inline-snapshot") or arg.startswith("--snap") for arg in sys.argv)
    or "INLINE_SNAPSHOT_DEFAULT_FLAGS" in sys.argv
):
    from inline_snapshot import Is as Is, snapshot as snapshot
    from inline_snapshot.extra import raises as raises, warns as warns
    from inline_snapshot.plugin import Builder as Builder, Custom as Custom, customize as customize
else:

    class _SnapshotProxy:
        """Proxy that compares using the snapshot value, warning on mismatch."""

        def __init__(self, value: Any) -> None:
            self._value = value

        def __repr__(self) -> str:
            return repr(self._value)

        def __eq__(self, other: object) -> bool:
            result = other == self._value
            if not result:
                warnings.warn(
                    f"Snapshot mismatch: {other!r} != {self._value!r}\n"
                    "Re-run with --inline-snapshot=fix to update snapshots.",
                    stacklevel=2,
                )
            return result

    _MISSING = object()

    def snapshot(value: Any = _MISSING) -> Any:
        if value is _MISSING:
            raise RuntimeError(
                "snapshot() called without a value. Run with --inline-snapshot=create to generate initial snapshots."
            )
        return _SnapshotProxy(value)

    class Is:
        def __init__(self, value: Any) -> None:
            self.value = value

        def __repr__(self) -> str:
            return f"Is({self.value!r})"

        def __eq__(self, other: object) -> bool:
            return other == self.value

    def customize(func: Any) -> Any:
        return func

    class Builder: ...

    class Custom: ...

    @contextmanager
    def warns(expected_warnings: Any, /, include_line: bool = False, include_file: bool = False) -> Iterator[None]:
        with catch_warnings(record=True) as caught:
            simplefilter("always")
            warnings.filterwarnings("ignore", message="unclosed event loop", category=ResourceWarning)
            yield
        formatted: list[str] = []
        for w in caught:
            parts: list[str] = []
            if include_file:
                parts.append(w.filename)
            if include_line:
                parts.append(str(w.lineno))
            parts.append(f"{w.category.__name__}: {w.message}")
            formatted.append(", ".join(parts) if len(parts) > 1 else parts[0])
        assert formatted == expected_warnings

    @contextmanager
    def raises(exception: Any) -> Iterator[None]:
        try:
            yield
        except Exception as e:
            actual = f"{type(e).__name__}: {e}"
        else:
            actual = "<no exception>"
        assert actual == exception
