"""Lightweight in-memory fake database for tests.

A portable pattern for testing code that depends on a database without a real
one. Subclass or extend `FakeDatabaseConn` to match the interface your code
needs; keep state in memory so tests are fast, deterministic, and hermetic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


class FakeTable:
    """A minimal fake table with a `get` lookup."""

    def __init__(self, rows: dict[str, Any] | None = None) -> None:
        self._rows = rows or {}

    def get(self, name: str) -> Any:
        return self._rows.get(name)


@dataclass
class FakeDatabaseConn:
    """An in-memory fake database connection.

    Provides a synchronous `execute` and an async key-value store. Extend with
    the methods your code calls. All state lives in memory, so tests are fast
    and don't need a real database.
    """

    users: FakeTable = field(default_factory=FakeTable)
    _store: dict[int, str] = field(default_factory=dict)

    async def execute(self, query: str) -> list[dict[str, Any]]:
        return [{"id": 123, "name": "John Doe"}]

    async def store(self, key: int, value: str) -> None:
        self._store[key] = value

    async def get(self, key: int) -> str | None:
        return self._store.get(key)


class QueryError(RuntimeError):
    pass
