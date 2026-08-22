---
name: farmed-test-harness
description: "Use when writing tests for code that talks to HTTP/LLM/external services — reuse the farmed test harness (cassette recording/replay, client error handling, pytest fixtures) instead of writing tests from scratch."
disable-model-invocation: true
---

# Farmed Test Harness

Reusable test patterns farmed from the inspo repos (pydantic-ai, graphrag, mem0)
so we don't reinvent them. This is "stack your leverage" applied to tests: the
good test code is already written — reuse it.

## When to Use

When writing tests for code that:
- Makes HTTP calls (→ use cassette recording/replay)
- Talks to LLM/external services (→ use cassette + client error handling)
- Needs pytest fixtures / slow-test gating (→ use the conftest patterns)

## The Farmed Assets (in `tests/harness/`)

- `cassette_utils.py` — (from pydantic-ai, 542 lines) unified verification for
  VCR HTTP cassettes and XAI protobuf cassettes. Record real responses, replay
  them in tests, verify cassette contents. Use for any HTTP/LLM integration test.
  Adapted to be standalone (no pydantic-ai imports).
- `harness_utils.py` — (from pydantic-ai conftest) portable utilities:
  `try_import` (graceful optional-import handling), session-scoped `event_loop`
  fixture, `raise_if_exception`.
- `mock_async_stream.py` — (from pydantic-ai) wraps a sync iterator as an async
  stream for testing async/await code. Adapted to be standalone.
- `conftest.py` — (from graphrag + browser-harness) pytest options + fixtures:
  `--run_slow` gating for slow tests, `fake_png` fixture for image/screenshot
  tests, project-root `sys.path` setup, and `collect_ignore_glob` to exclude
  subdirectories with their own suites.

## How to Use

1. **HTTP/LLM tests** — use `cassette_utils.py` to record a real response once,
   then replay it in tests (fast, deterministic, no network). Verify the cassette
   caught what you expect.
2. **Slow tests** — use the `--run_slow` option from `conftest.py` to gate slow
   tests behind a flag, so the fast suite runs in CI.
3. **Client error handling** — use `client_utils.py` patterns to test API error
   paths (auth, network, rate-limit) without hitting real services.

## The Methodology (from Pillar 4)

- A test is only good if it CATCHS — test the un-fixed and fixed versions.
- Farmed tests are BROAD: the cassette pattern catches any HTTP regression, not
  one case.
- Expand the farmed harness, don't duplicate it. When a new HTTP case slips past,
  expand `cassette_utils.py` rather than writing a new one.

## Verification

- A test that records a cassette fails against the un-fixed code and passes
  against the fixed code.
- Slow tests are gated behind `--run_slow` and don't block CI.
- The farmed harness is reused, not duplicated.
