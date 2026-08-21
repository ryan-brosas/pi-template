# LinkedIn MCP — Session State Reference

Source-grounded reference for `linkedin_mcp_server/session_state.py` (1,087 lines, read in full). This module implements cross-platform logged-in-profile reuse — the single most instructive pattern in the repo. Support: `linkedin_mcp_server/profile_claim.py` (ownership), `linkedin_mcp_server/windows_acl.py` (platform ACLs).

## WHAT: two state files + derived runtime profiles

A source login produces FOUR artifacts under one auth root (`auth_root_dir` = parent of the configured profile dir): the `profile/` directory itself, `cookies.json` (portable export), `source-state.json` (`SourceState`: version, source_runtime_id, **login_generation** = uuid4, created_at, profile_path, cookies_path), and `runtime-profiles/<runtime_id>/` where each consuming runtime derives its own profile + `storage-state.json` + `RuntimeState` recording WHICH source generation it came from.

`get_runtime_id()` = `{os}-{arch}-{host|container}` (e.g. `macos-arm64-host`) — deterministic identity so a session prepared on one runtime kind is imported by matching runtimes.

## WHY `canonical()` exists (:60-77)

Every path in this module goes through `canonical(profile_dir) = expanduser().resolve()` — "the only way this module spells it". The docstring records the bug: half the functions expanded WITHOUT resolving, the other half resolved WITHOUT expanding. A relative path survives that split; **a symlink does not** — `shutil.move` relocates the link while sidecars are computed from the target's parent, splitting ONE session across TWO roots with no error anywhere.

**The lesson: path normalization must be one named function used everywhere — not because either operation is wrong alone, but because the PAIRING is the invariant.**

## Container detection as measured epistemology (:155-410)

The longest docstrings in the file are post-mortems of real misdetections:

- **Only signals describing OUR process count.** Searching mountinfo/cgroup for "docker" substrings matched workstations merely RUNNING Docker daemons — permanent, unrecoverable misdetection (every tool call answered "run --login on the host").
- **Cgroup segments, not substrings**: match whole path segments against `{docker, containerd, kubepods, podman, machine, moby}`; skip `.service/.socket/.mount` (docker.service IS the host's daemon); systemd escapes dashes so `app-docker\x2ddesktop.scope` un-escapes to a desktop app.
- **Instance-id regex** `^(libpod-|crio-|docker-|containerd-)[0-9a-f]{32,}$` — 32 hex MINIMUM because runtimes write full 64-char ids and no hand-named service reaches that (`docker-backup.scope` was once misread as a container).
- **LXC/nspawn** named prefixes (`lxc.payload.`, `machine-`) kept separate from id regexes since they carry arbitrary user text.
- **Mount ROOT, never mount source**: rootfs layouts (`/var/lib/docker/` etc.) compared against the kernel-reported mount root; an NFS source label describes somebody else's namespace. Network filesystems skipped entirely. Native-snapshotter containerd gets a plain bind mount — type-check alone reads as host, and false negatives are the DANGEROUS direction (container looks for a keychain that isn't there).
- Deliberately ignored: `/run/systemd/container` — OrbStack reports `lxc` yet is a full desktop-class system.
- `LINKEDIN_MCP_CONTAINER=true/false` overrides everything: detection is a heuristic over other people's kernels, and without an override being wrong means editing installed source. An UNREADABLE override value falls through to detection with a warning — "an unreadable value is not a decision".

## Rotation / quarantine / restore (:640-1087)

WHY rotation at all: Chromium mints `machine_id` and friends into `Local State` once per profile — reusing the directory for a different account hands LinkedIn the same device identity twice, linking accounts. Every new-session path rotates FIRST.

- **Move, don't delete**: retired artifacts go to `<root>/invalid-state-<ts>-<uuid8>/`. A session that turns out fine stays recoverable; `--logout` clears quarantines.
- **Atomicity discipline**: partial move failure RESTORES what moved before raising — caller sees old-intact or fully-retired, never split. Same for restore: partial restore re-retires into quarantine rather than straddling both places (split sessions get divided AGAIN by the next rotation).
- **Cancel-deferral**: `run_deferring_cancels` runs rotation in an executor via a bare Future (NOT `to_thread` — its task lands in `all_tasks()` and shield-spinning blocks loop teardown); cancels during the move are deferred, then honored after the session is accounted for or restored. "A cancel landing after the thread moved the session strands the user logged out."
- **Peer-guard**: `rotate(superseded_by=<generation>)` — under the lease, if a DIFFERENT usable generation appeared, raise `PeerSessionInPlaceError`, distinct from `None` (= nothing to retire). Conflating them made a caller promise a login window that never opened. `UNGUARDED = object()` sentinel distinguishes "no generation observed" from "no guard requested" — conflating those let client 2 quarantine client 1's fresh login.
- **Committed replacement check**: restore refuses when source-state + non-empty profile + cookies.json ALL exist — anything less is debris (abandoned Chromium launch), and reading debris as a replacement would strand the working session in quarantine.
- **Restore validates the backup too**: `_our_quarantine` requires name AND location (prefix + directly inside the owned root) — an unchecked backup_dir would let foreign content be written INTO an owned root.
- Quarantine stamps add a uuid suffix because timestamps are second-resolution and rotation is routine.
- `clear_auth_state` deletes quarantines TOO (they hold cookies) but deliberately KEEPS the ownership marker — logout is exactly when the next run needs it.

## Chromium lock attribution (`profile_in_use_by` :700-737)

Of Chromium's three Singleton* links only `SingletonLock` encodes `<hostname>-<pid>`. Presence proves NOTHING (crash leaves it behind): parse the target, compare hostname — foreign host (a container writing into the shared auth root) → assume LIVE and refuse to rotate (operator can stop the container; the reverse corrupts two sessions silently); same host → `os.kill(pid, 0)` probes liveness, ProcessLookupError → stale, safe.

## `_exclusive_profile` — three independent signals (:739-800)
Held across the WHOLE mutation (check-then-release leaves a window where another process launches Chromium mid-move): (1) our own browser flag (kept deliberately when close was unconfirmed), (2) the reference-counted lease every cooperating process takes — authoritative only among cooperators, (3) Chromium's SingletonLock catching FOREIGN holders (older versions, containers, humans). Note: chrome-headless-shell never writes SingletonLock — precisely why the lease exists. ALL profiles checked, not just source: containers run Chromium out of runtime-profiles while sharing the mounted auth root.

**The lessons: auth-state mutation needs exclusive multi-signal locking, move-not-delete reversibility, peer-change detection under the lock, and error taxonomies where None/Error/sentinel mean different things callers act on. And heuristic environment detection should be written as measured post-mortems, conservative toward the dangerous direction, always overridable.**
