# MCP TS SDK — OAuth Client Authorization Reference

(Source-grounded; read in full: `packages/client/src/client/auth.ts` (2,376 lines) with probes from `test/client/auth.test.ts`.)

Complete source-grounded reference for the client authorization machinery. File: `packages/client/src/client/auth.ts` (2,376 lines, read in full); probes from `test/client/auth.test.ts`. The design implements SEP-2352 (per-authorization-server credential isolation), RFC 6749/8414/9207, and OIDC discovery.

## The provider seam: minimal contract, adapted richness

Transports never learn OAuth. They see a two-method interface — `AuthProvider { token(), onUnauthorized?(ctx) }` (:60-92) — while full OAuth implementations expose `OAuthClientProvider` (~25 members, :223-471) adapted down via `adaptOAuthProvider` (:195-221). Classification is duck-typing on `tokens` + `clientInformation` (`isOAuthClientProvider`, :166-170), so pre-rewrite provider code keeps working across majors.

The 401 retry contract is precise (:82-85): "the transport will await this, then retry the request once. If the retry also gets 401, or if this method is not provided, the transport throws UnauthorizedError." And a subtlety documented at :201-207: the adapted `token()` read passes NO issuer context because "the access token is sent only to the resource server, never to an AS" — providers keying on context must treat `ctx === undefined` as "return the most-recently-saved token set."

**Lesson:** design auth around a minimal token-supplier seam and adapt richer capability sets down into it; classify by duck-typing so old implementations survive major rewrites.

## SEP-2352: credentials stamped with their issuer, reads fail closed

Every stored credential — client information AND tokens — carries an `issuer` stamp written by `auth()` itself at every save point (:1240-1257, :1278, :1300). Reads pass through `discardIfIssuerMismatch` (:110-143): a stamp naming a different AS reads back as `undefined`, forcing clean re-registration/re-auth; an UNSTAMPED legacy value passes with a warning and is **back-stamped** on first use (:1216-1223, :1291-1299).

The warning is explicit about the stakes: "SEP-2352 isolation is inactive for this read; ensure your provider round-trips the issuer field." A static-credential provider whose stamp mismatches gets a typed `AuthorizationServerMismatchError` rather than the generic fallback (:1210-1214).

The deepest piece is the **callback-leg gate** (:1156-1181), quoted verbatim:

> "Stored credentials are protected structurally by the issuer stamp, but the in-flight `authorization_code` + PKCE `code_verifier` are not stored — they are bound to the AS the redirect targeted, recorded in `discoveryState()`. Fail-closed: a provider that implements saveDiscoveryState but returned no discovery state on the callback leg … MUST NOT proceed — fresh discovery may have resolved a different AS than the one the user approved at /authorize."

Even the ORDER of persistence is security-relevant (:1132-1134): fresh discovery state is captured now but persisted only AFTER the gate — "so a gate throw cannot leave a freshly resolved (potentially PRM-poisoned) AS recorded for the retry to read back as recordedIssuer."

**Lesson:** bind persisted secrets to their issuing authority STRUCTURALLY (stamp on the stored object, checked at read time) rather than by caller discipline — and make the unverifiable path fail closed, not warn-and-proceed.

**Probe:** tests describe block "SEP-2352: per-authorization-server credential isolation" (:4705): tokens stamped issuer=A must never be POSTed to AS=B's token endpoint; a saveDiscoveryState provider returning nothing on the callback leg throws before any token request.

## Issuer discovery: PRM → AS metadata with §3.3 echo rejection

Discovery resolves the MCP server URL to an authorization server in layers (:1892-1954): probe `/.well-known/oauth-protected-resource` (path-aware, then root fallback), take `authorization_servers[0]`, else synthesize the root URL as fallback. Then fetch AS metadata trying OAuth and OIDC well-known variants (:1706-1758 builds the URL priority list).

Two policies are documented better than most production code:

- **Issuer echo** (:1775-1780): metadata whose `issuer` doesn't match the discovery URL is rejected with `IssuerMismatchError` — an anti-metadata-spoofing control per RFC 8414 §3.3. `skipIssuerValidation` exists but is labeled "security-weakening." One narrow tolerance (:1862-1870): a trailing-slash difference is accepted ONLY because the SDK's own fallback synthesizes that form — "that value is SDK-generated (not attacker-controlled)… a different host or path is still a mismatch."
- **CORS asymmetry** (:1547-1556): in browsers a fetch `TypeError` might be CORS, so retry-without-headers then fall through to the next URL; "in non-browser runtimes a TypeError from fetch is NEVER a CORS error — there we propagate instead of swallowing." Same principle at the PRM layer: "propagate so the caller sees the real error instead of silently falling back to a different auth server."

Fallback attempts are gated by status: only `4xx` or `502` continue to the next candidate URL (:1613-1617).

**Lesson:** layered discovery needs both a strict identity-echo check at each layer AND an explicit policy for ambiguous failures — swallow only what you can name, propagate what you cannot.

**Probe:** serve metadata whose issuer differs from the well-known base → IssuerMismatchError; trailing-slash-only difference → accepted; Node-runtime TypeError → propagates instead of falling through.

## Scope machinery: unions without semantics, step-up without refresh

Requested scope follows a fixed four-step priority (:1029-1032): WWW-Authenticate header → PRM `scopes_supported` → client metadata scope → omit. SEP-2207 augments `offline_access` only when the AS advertises it AND the client's grant_types include refresh_token — deliberately NOT applying the DCR default "so statically-registered/CIMD clients are not pushed into offline_access + prompt=consent" (:1035-1046).

On a 403 insufficient_scope challenge, `computeScopeUnion` merges old and new scopes — explicitly refusing semantic dedup (:593-596): "a union may contain semantically redundant entries… Authorization servers normalize such redundancy during token issuance." If the union strictly exceeds the granted scope, REFRESH IS BYPASSED entirely (`forceReauthorization`), because:

> "the refresh grant cannot widen scope (RFC 6749 §6), so refreshing would silently drop the new scope and the next request would 403 again." (:971-977)

Conservativity rule: an absent token `scope` counts as EMPTY (:624-628) — err toward re-consent rather than silent privilege loss. And when offline_access makes the cut, `prompt=consent` is appended per OIDC OfflineAccess (:2000-2010).

**Lesson:** treat scope widening as an authorization-endpoint-only operation; compute unions mechanically (exact-token, order-preserving) and let conservative defaults err toward re-consent rather than silent privilege loss.

**Probe:** describes at :196/:218/:4438 cover union/superset/selection; assert `isStrictScopeSuperset(undefined, 'read') === false` and that determineScope with requestedScope set ignores PRM scopes_supported.

## Callback validation: attacker-controlled text behind an issuer gate

`resolveAuthorizationCallbackParams` (:639-700) plus `validateAuthorizationResponseIssuer` (:555-583) implement a mix-up-attack posture spelled out in the resolver doc (:641-651): when a `code` is present, issuer validation happens against freshly-discovered metadata BEFORE redemption, "so on mismatch the thrown IssuerMismatchError carries no error/error_description/error_uri text from the callback — those are attacker-controlled in a mix-up." Error-shaped callbacks (no code) validate `iss` FIRST, and only then surface the callback's error fields; with no authentic baseline at all, a GENERIC UnauthorizedError is thrown and the callback's text never appears.

The decision table has four rows (:524-553), including the non-obvious ones: server advertises iss support + iss ABSENT → throw, because "absence is a stripped-parameter attack indicator"; comparison is simple string equality per RFC 3986 §6.2.1 — "scheme/host case folding, default-port elision, trailing-slash, and percent-encoding normalization are explicitly NOT applied."

**Lesson:** never trust redirect payloads until you've proven who sent them — validate issuer identity before reading any attacker-influenced callback field, and degrade to a generic error when no authentic baseline exists.

**Probe:** describes at :1235/:1295. Assert (issSupported=true, iss absent) throws; (false, absent) proceeds; a params-form callback with no discoverable baseline yields an UnauthorizedError containing none of the callback's error text.

## Token requests: one chokepoint, negotiated method, secure endpoint

Covers applyClientAuthentication, selectClientAuthMethod, assertSecureTokenEndpoint, and executeTokenRequest — all in `packages/client/src/client/auth.ts`.

Client authentication selects exactly ONE of `client_secret_basic` | `client_secret_post` | `none` via a priority ladder: DCR-issued hint → RFC 8414 §2 default → intersection with server-advertised methods → has-secret fallback (`selectClientAuthMethod`). All application flows through `applyClientAuthentication`; token URLs pass `assertSecureTokenEndpoint` (http:// non-loopback → InsecureTokenEndpointError; localhost allowed).

Refresh merges `{ refresh_token, ...tokens }` so an absent rotated token keeps the old one, and invalid-client errors invalidate ONLY the right scope — the retry-scoping comment (:997-999) preserves discoveryState across invalidation "so the callback-leg gate on retry doesn't fire a false AuthorizationServerMismatchError that masks the real invalid_client." A 200 response body carrying `{"error": ...}` still raises OAuthError.

**Lesson:** centralize credential application in one chokepoint that enforces transport security and method negotiation, and classify every failure as retryable-with-scope-invalidation, configuration-error, or fatal — never blanket-retry.

**Probe:** describes at :1706 (method selection), :2459 (https guard: http://10.0.0.1 throws, http://localhost allowed), :3606/:3789 (multi-method exchange/refresh).
