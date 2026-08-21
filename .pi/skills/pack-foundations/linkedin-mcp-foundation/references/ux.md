# LinkedIn MCP — Login Viewer UX (5W1H)

Source-grounded reference for `login_viewer.py` (357 lines, read in full): short-lived noVNC access to the Docker login browser.

## WHO
A user logging into LinkedIn from inside a container that has no display — they need to SEE and drive the login browser from their host browser.

## WHAT
A supervised stack (Openbox WM → x11vnc on loopback → websockify/noVNC) exposed at a TOKEN-PRIVATE URL for a bounded window (`VIEWER_WALL_SECONDS = 1800`).

## WHEN
Only under `--login-viewer`; before ANY of it starts, a preflight refuses logins whose result would die with the container.

## WHERE
Preflight :66-176, supervision :181-357, viewer URL :170-174.

## WHY (the preflight is the product)
Every refusal names the REMEDY inline (`_remedy`: exact `-v ~/.linkedin-mcp:...` flag or volume path):

- *Mount-on-profile is worse than no mount*: session rotation MOVES the profile directory aside, but a mountpoint cannot move — `shutil.move` falls back to copy-then-delete across devices, duplicating then emptying the session before EBUSY (:88-96 comment). Refusal message says exactly what to mount instead (the auth ROOT).
- *Nearest covering mount only*: an ancestor further up describes a different filesystem once something closer mounts over it (:100-104).
- *tmpfs/ramfs fails the same test as no mount*: "a filesystem held in RAM answers every question a bind mount answers… it still loses the session when the container stops" (:19-22).
- *Write-permission checked BEFORE rotation* (:140-176): Docker seeds named volumes root-owned and so do earlier rootful runs; discovering unwritability on first write happens AFTER the previous session moved aside. The error includes uid/gid and a literal `sudo chown` command.
- *mountinfo parsed defensively*: optional-tag fields searched from index 6 so a mount point literally spelled `-` isn't mistaken for the separator; octal escapes decoded (:30-45).

## HOW
- Token file created `O_WRONLY|O_CREAT|O_EXCL` mode 0o600 in a 0o700 temp dir; token = `secrets.token_urlsafe(32)`; x11vnc listens LOOPBACK ONLY (`-listen 127.0.0.1 -allow 127.0.0.1 -no6`) with `-nopw` because the token gate lives in websockify's ReadOnlyTokenFile.
- Layered readiness: each process gets a per-component LOG FILE; `_require_alive` polls after every start, `_wait_for_port` polls TCP with 0.1s sleeps up to 10s, openbox readiness = `obxprop --root _NET_SUPPORTING_WM_CHECK` actually answering (not just process-alive).
- Failure messages APPEND THE COMPONENT LOG — diagnosis ships with the error.
- Teardown removes exposure in REVERSE order (websockify → x11vnc → openbox), attempts EVERY layer even after one fails (first exception preserved), deletes the credential file and temp dir in a `finally`.
