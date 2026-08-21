# LinkedIn MCP Foundation — Deep Reference


# LinkedIn MCP Foundation

A deep reference for the linkedin-mcp-server (stickerdaniel). Apache-2.0, branch `main`, commit cfcd9c9 (2026-08-15). Root: `/mnt/hdd/utopia/inspo/linkedin-mcp-server`. Graph: 4086 nodes / 22079 edges. The single most instructive pattern in the whole repo: **how to expose a logged-in browser session as an MCP server** — session persistence, daemon ownership, and cross-platform profile reuse, each with hard-won edge cases documented in the source.

## Architecture

```
cli_main.py          -> CLI entry: config load, browser install, interactive login, server start
daemon_owner.py      -> the elected owner process (holds the browser + daemon.lock)
server.py            -> create_mcp_server() (FastMCP); ServerRole selection
bootstrap.py         -> managed runtime bootstrap: browser env, login, session rotate
session_state.py     -> auth-state persistence: source/runtime state, portable cookies, rotation
config/              -> loaders.py (env-driven) + schema.py (AppConfig/BrowserConfig, validate())
drivers/browser.py   -> patchright browser singleton (get_or_create_browser, close_browser)
profile_lease.py     -> reference-counted per-operation browser lease
daemon_lock.py       -> process-lifetime ownership lock (one holder, no refcount)
daemon_descriptor.py -> what a running daemon publishes; loopback-checked, fingerprint-compared
profile_claim.py     -> ensure_profile_claim(): claim the profile before driving it
tools/               -> FastMCP @mcp.tool registrations: person, company, job, messaging, feed, post
scraping/            -> extractor, fields, connection, link_metadata
browser_import/      -> auto-import a LinkedIn session from a locally logged-in browser
```

Boundaries (graph): test_profile_lease_integration->profile_lease (42), ->session_state (39), ->config (21), ->drivers (17). Hotspots: portable_cookie_path (54), load_from_env (52), browsers_path (48), BrowserConfig.validate (48), DaemonLock.release (44), new_token (44).

## The core primitives

### 1. Session-state persistence (session_state.py) — the crown jewel

Cross-platform auth reuse without a keychain. Two state files + a derived profile:

- **SourceState** (source-state.json): version, source_runtime_id, login_generation, created_at, profile_path, cookies_path. The original login.
- **RuntimeState** (runtime-state.json): version, runtime_id, source_runtime_id, source_login_generation, created_at, committed_at, profile_path, storage_state_path, commit_method. A derived runtime session.
- **portable_cookie_path()**: auth_root_dir / cookies.json. The auth root is the profile's *parent* — so .../profile and .../profile2 share one auth root and therefore one lock (deliberate).

The **canonical() rule**: every path goes through expanduser().resolve(). The source explains the exact bug this prevents: a symlink survives the expand/resolve split, so shutil.move would relocate the profile link but compute sidecars from the target's parent — one session, split across two roots, no error. **Always canonicalize both halves before pairing them.**

**Container detection (_is_container_runtime)**: conservative, override-able via LINKEDIN_MCP_CONTAINER. Deliberately NOT /run/systemd/container (answers a different question — OrbStack reports lxc yet is a full desktop). Real signals: /.dockerenv, /run/.containerenv, cgroup + mountinfo probes on pid 1 and self. A false negative (container thinks it's a host) is the *worse* failure, so it errs toward conservative.

### 2. Daemon ownership (daemon_lock.py + daemon_descriptor.py)

**Lock vs lease** — the key distinction:
- **profile_lease**: reference-counted, per-operation. Held by a tool call, the browser singleton, and a destructive helper at once; released the moment the browser closes so --login can take it.
- **daemon_lock**: process-lifetime, one holder, no refcount, released only on exit. Decides *ownership*, not idleness.

**Two hard rules from the source:**
1. **Never unlock before closing.** A duplicate descriptor shares the lock; unlocking through any copy releases it for all. Measured on POSIX and Windows.
2. **Never treat a free lock as proof nothing is running.** The kernel frees the lock at the instant of death; Chromium is wired via --remote-debugging-pipe and exits when the pipe breaks (13-38 ms on this machine, 11-103 ms independently). What actually keeps two processes off one profile is the lease, not the lock.

**Windows vs POSIX (measured, not assumed):** inherited lock handles transfer on POSIX only. On Windows, a child that inherited the handle did NOT hold the lock in 20/20 runs once the parent exited. So the elected process takes the lock itself on Windows.

**Descriptor trust model:** a client about to send a bearer token to a daemon checks: endpoint is loopback (before the token goes anywhere), profile path compared exactly, config compared via a **keyed fingerprint** (proxy_password is part of what must match; a plain hash over guessable config would be an offline password guess). The token itself is deliberately not stored in the descriptor.

### 3. Config validation (config/schema.py)

BrowserConfig is a dataclass with a validate() that:
- Rejects: slow_mo < 0, default_timeout <= 0, non-positive viewport, non-finite/negative login timeouts.
- **Clamps** (doesn't reject) some ranges — read the source for which.
- **Splits proxy credentials off** so the stored value never holds a password; proxy_username/proxy_password are repr=False because cli_main logs the whole config at DEBUG and users paste logs into issues.
- Keeps dead fields (user_agent, eager_full_chromium) because they hash into the daemon's SHARED_CONFIG_FIELDS fingerprint — dropping one makes a running owner unreadable to a client of the other version. **Lesson: config fingerprint fields are a compatibility contract, not cleanup targets.**

load_from_env (fan-in 52) drives config from LINKEDIN_MCP_* env vars; is_loopback_host rejects DNS-only names (a name can point anywhere).

### 4. The MCP tool surface (tools/, FastMCP)

@mcp.tool registrations, Depends()-based DI for browser/extractor, raise_tool_error() centralized, singleton driver for session persistence.

- **person.py**: get_person_profile, search_people, connect_with_person, get_sidebar_profiles, get_my_profile
- **company.py**: get_company_profile, get_company_posts, search_companies, get_company_employees
- **job.py**: get_job_details, search_jobs, get_saved_jobs
- **messaging.py / feed.py / post.py**: inbox, conversations, search, send; home feed; global post search

## How to use

- **When you need to persist a logged-in browser session cross-platform** -> port session_state.py: source/runtime state files, portable cookie path, canonical() everywhere, conservative container detection with an override env var.
- **When you need a daemon that owns a shared browser** -> daemon_lock.py (process-lifetime, one-holder) + profile_lease.py (reference-counted, per-op) + daemon_descriptor.py (loopback-checked, keyed-fingerprint trust).
- **When you need an MCP server over a browser** -> FastMCP + @mcp.tool + Depends() DI + singleton driver + centralized raise_tool_error(), exactly as tools/ does.
- **When you need validated browser config** -> BrowserConfig.validate() + env-driven load_from_env + repr=False on secrets + keyed config fingerprint.
- **When you need session auto-import from a locally logged-in browser** -> browser_import/ (auto_import_from_browser, gated off under Docker / non-loopback HTTP).

## Red Flags

- Non-canonical paths (missing expanduser().resolve()) — the symlink split-root bug.
- Unlock-before-close on a shared lock — releases it for every holder.
- Free lock treated as proof of no running process — the 13-38ms Chromium pipe-exit window.
- Plain-hash config fingerprint with secrets — offline password guess.
- repr on proxy credentials — they leak into DEBUG logs.
- Removing a "dead" config field that's in SHARED_CONFIG_FIELDS — breaks owner turnover.
- Non-loopback HTTP bind with auto_import_from_browser — a network-exposed server must not read host cookies.

## Verification

- A session persists across process restarts and platforms (source + runtime state round-trip).
- Two processes cannot both drive one profile (lease holds; lock held for process lifetime).
- A daemon client refuses a non-loopback endpoint before sending the token.
- Config fails fast on invalid values; secrets never appear in repr or logs.
- LINKEDIN_MCP_CONTAINER override actually flips container detection.

## Skill Result Contract

```xml
<skill_result>
  <skill>linkedin-mcp-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Pattern ported from source, provenance cited, verified</evidence>
  <artifacts>Integration + auth flow + daemon</artifacts>
  <risks>Cookie exposure, broken lock/lease, fingerprint drift, or none</risks>
</skill_result>
```
