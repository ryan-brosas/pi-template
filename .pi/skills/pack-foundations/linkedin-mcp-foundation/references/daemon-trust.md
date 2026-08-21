# LinkedIn MCP — Daemon Trust Reference

Source-grounded reference for the trust machinery around the singleton daemon (read in full during the deep pass). Files: `linkedin_mcp_server/daemon_lock.py` (434 lines), `linkedin_mcp_server/profile_lease.py` (653 lines), `linkedin_mcp_server/daemon_descriptor.py` (1,010 lines), with ownership in `linkedin_mcp_server/daemon_owner.py` (837 lines) and election in `linkedin_mcp_server/daemon_election.py` (1,025 lines).

## Lock vs lease: two different lifetimes

The repo separates ownership by duration:

- **daemon_lock.py** holds the PROCESS-LIFETIME, one-holder lock: the daemon that owns the shared browser.
- **profile_lease.py** is REFERENCE-COUNTED, per-operation: every cooperating process takes a lease before opening Chromium, releases after. The lease survives across operations within one process; a close that cannot be CONFIRMED keeps the lease deliberately alive (Chromium may still be running — better an over-held lease than a torn profile).

Together with the browser's OWN SingletonLock (attributed per-host via `linkedin_mcp_server/session_state.py` profile_in_use_by), these form the three-signal exclusivity contract documented in session-state.md — none alone is sufficient.

**Lesson:** model ownership at TWO granularities — a considered-acquire/atomic-release process lock, plus a refcounted per-use lease that errs toward hold-on-uncertain-teardown.

## Descriptors: loopback-checked, keyed-fingerprint trust

`linkedin_mcp_server/daemon_descriptor.py` publishes a descriptor for client-side daemon discovery. The trust model per the docstrings: loopback-checked endpoint addresses AND a fingerprint keyed to the server identity — a process speaking from a stale descriptor cannot pass for the current daemon. `linkedin_mcp_server/daemon_liveness.py` (347 lines) answers the liveness question independently; `linkedin_mcp_server/daemon_election.py` (1,025 lines) arbitrates racing daemon starts.

**Lesson:** publish trust, don't assume it — acquire an identity-scoped fingerprint and verify it on every bind.

## Verification

The lock/lease behaviors are pinned by the test suites in the repo tests directory (daemon_lock harvests, profile_lease reentrancy cases, daemon_descriptor fingerprint mismatch rejections). All three must fail CLOSED: an unverifiable owner refuses access rather than tolerating ambiguity.
