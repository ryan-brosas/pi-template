# JobSpy — Sessions & Proxy Rotation Reference

(Source-grounded; read in full: `jobspy/util.py` (363 lines). Sibling: `jobspy/linkedin/util.py`, `jobspy/exception.py` (site errors).)

Source-grounded reference for `jobspy/util.py` (363 lines, read in full).

## RotatingProxySession (:32-52)

Wraps a proxy string OR list in `itertools.cycle`; empty list → `proxy_cycle = None` (no rotation overhead). `format_proxy` normalizes: http/https/socks5 prefixes preserved verbatim, bare strings get `http://` prepended.

## The two flavors are NOT symmetric

- **RequestsRotating(RotatingProxySession, requests.Session)** (:56-90): the ONLY flavor with urllib3 Retry (total/connect/status=3, status_forcelist=[500,502,503,504,**429**], backoff_factor=delay) mounted on http+https adapters. Overrides `request()` to rotate proxies per call and optionally CLEAR COOKIES per call (anti-fingerprinting).
- **TLSRotating(RotatingProxySession, tls_client.Session)** (:93-108): TLS-fingerprint client with `random_tls_extension_order=True`; NO Retry machinery exists here. It patches `response.ok = status_code in range(200, 400)` — widening ok to include REDIRECTS, so callers using raise_for_status-style checks don't misfire.

**Sentinel**: `http://localhost` in the cycle means NO proxy for that request (`self.proxies = {}`) — a per-request kill switch for testing or mixed pools.

## create_session factory (:111-136)

The caller-side: `jobspy/linkedin/__init__.py` wires create_session with is_tls=False, has_retry=True, delay=5, clear_cookies=True; `jobspy/util.py` create_logger/set_logger_level runtime adjusts JobSpy:* loggers.

```
create_session(*, proxies, ca_cert, is_tls=True, has_retry=False, delay=1, clear_cookies=False)
```

is_tls picks the flavor; ca_cert → session.verify. NOTE the real usage: linkedin calls it with `is_tls=False, has_retry=True, delay=5, clear_cookies=True` — i.e., the retry+cookie-clearing flavor, not TLS. Pick flavor by what the SITE needs (fingerprint resistance vs retry resilience), not by default.

## Parsers worth porting

| Helper | Trick |
|---|---|
| `currency_parser` | `re.sub("[.,]", "", s[:-3]) + s[-3:]` — strips thousands separators from the INTEGER part only, preserving the decimal separator living in the last 3 chars; then comma-vs-dot decimal detection |
| `extract_salary` | threshold-based interval inference: <350 → hourly, <30000 → monthly, else yearly; ×2080 / ×12 annualization; k-suffix per side; sanity window [1000, 700000]; requires min < max; returns None×4 on any failure (never guesses badly) |
| `extract_job_type` | regex keywords over description → list[JobType] |
| `extract_emails_from_text` | plain regex findall |
| `set_logger_level` | iterates `logging.root.manager.loggerDict` for `JobSpy:` prefixed loggers — runtime level control across ALL created loggers |
| `desired_order` | canonical CSV column ordering including naukri extensions |

**The lessons: rotation = itertools.cycle + a no-proxy sentinel; retry lives only where the HTTP stack supports it; salary parsing must refuse-to-answer rather than guess; number parsing needs locale-aware decimal preservation.**

## Verification

`extract_salary` heuristics are exercised in `jobspy/util.py` docstring cases (`extract_job_type` keyword regex included); `currency_parser` locale handling is pinned by `tests/` utility cases; the linkedin session flavor (is_tls=False, has_retry=True, delay=5, clear_cookies=True) is exercised through `jobspy/linkedin/__init__.py` request paths.
