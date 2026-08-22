"""Portable retry-header parsing helpers.

Parse HTTP `Retry-After` headers (seconds or HTTP-date) and extract status
codes / retry info from exceptions. Useful for testing and implementing retry
logic against HTTP/LLM APIs.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from email.utils import parsedate_to_datetime


def iter_error_chain(error: Exception) -> Iterator[Exception]:
    """Yield an exception and its cause chain (outermost first)."""
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        yield current  # type: ignore[misc]
        current = current.__cause__


def parse_retry_after_ms(value: str | None) -> float | None:
    """Parse a `retry-after-ms` header value (milliseconds) into seconds."""
    if value is None:
        return None
    try:
        parsed = float(value) / 1000.0
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def parse_retry_after_value(value: str | None) -> float | None:
    """Parse a `retry-after` header value (seconds or HTTP-date) into seconds."""
    if value is None:
        return None

    try:
        parsed = float(value)
    except ValueError:
        parsed = None
    if parsed is not None:
        return parsed if parsed >= 0 else None

    try:
        retry_datetime = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        return None
    return max(retry_datetime.timestamp() - time.time(), 0.0)


def get_status_code(error: Exception) -> int | None:
    """Extract an HTTP status code from an exception or its cause chain."""
    for candidate in iter_error_chain(error):
        for attr_name in ("status_code", "status"):
            value = getattr(candidate, attr_name, None)
            if isinstance(value, int):
                return value
    return None
