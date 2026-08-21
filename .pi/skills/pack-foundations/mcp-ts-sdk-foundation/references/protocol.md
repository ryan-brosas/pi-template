# MCP TypeScript SDK — Protocol Internals Reference

Source-grounded reference. Read: `core-internal/src/shared/protocol.ts` (:1-130 head + structure), `shared/inboundClassification.ts` (:1-110, full docstring), wire layout survey. Graph: 4,346 nodes / 15,001 edges.

## 1. Dual-era protocol serving (the inbound ladder)

- **WHO** — servers that must accept OLD (2025-era) and NEW (2026-era `server/discover`) protocol clients on ONE endpoint.
- **WHAT** — a body-primary classifier evaluated ONCE at the HTTP entry, returning plain routing values — it NEVER throws and never touches the transport (`inboundClassification.ts`).
- **WHEN** — every inbound POST; GET/DELETE are body-less legacy session operations by definition (modern era is POST-only).
- **WHERE** — module docstring :1-60 (a complete decision table), classifier input :62-84, outcomes :86-110.
- **WHY each cell** —
  - *Body beats headers*: `initialize` is legacy by definition UNLESS its `_meta` carries a valid modern-revision envelope claim — and then the modern era answers method-not-found like any unknown method. The `MCP-Protocol-Version` HEADER is a cross-check only: it can never upgrade or downgrade a body-derived classification.
  - *Malformed claims never fall back silently*: an envelope present but invalid is a validation error, not legacy traffic — silent fallback would let a broken modern client execute as legacy.
  - *Header/body disagreement is an explicit outcome*: `-32020 HeaderMismatch` on HTTP 400, matching the published CONFORMANCE SUITE cells (error assignments cite their source and carry a `settled` flag for provisional cells).
  - *Batches classify element-wise*: one modern-claiming or invalid element rejects the array; all-legacy arrays pass unchanged; single-element arrays stay arrays.
  - *Legacy stays byte-identical*: legacy routing outcomes deliberately carry NO MessageClassification — hand-wired traffic dispatches exactly as before.
  - *Defensive symmetry for notifications*: spec leaves notification-POST header rules undefined; applying request rules symmetrically keeps custom-notification POSTs' `-32020` cells passing — labeled SDK-defensive posture, not spec compliance.

## 2. The Protocol base class (correlation machinery)

- **WHO** — both Client and Server extend it (`Protocol<ContextT>` :558).
- **WHAT** — JSON-RPC request/response/notification plumbing: per-id handler maps (`_responseHandlers`, `_progressHandlers`, `_timeoutInfo`), capability negotiation, cancellation, timeouts.
- **WHEN** — any request lifecycle; `notifications/cancelled` and `notifications/progress` handlers registered IN THE BASE (:612-618).
- **WHERE** — options :56-90, timeout types :514-520, class fields :559-567.
- **WHY** —
  - *Progress resets timeouts*: `resetTimeoutOnProgress` lets long operations keep a short per-progress timeout instead of one huge blanket; `maxTotalTimeout` bounds the total so a chatty progress stream can't extend forever (:117-130).
  - *Capability enforcement is opt-in* (:75-82): `enforceStrictCapabilities` checks REMOTE advertised capabilities before emitting requests, defaulting false "for backwards compatibility with SDK versions that did not advertise correctly" — local capability mismatches remain hard logic errors.
  - *Notification debouncing*: listed methods coalesce within one event-loop tick (:83-89) — e.g. repeated `tools/list_changed` storms collapse.
  - *Wire eras are codecs*: `codecForVersion` / `bootstrapOutboundCodec` / `classifiedWireEra` — per-revision GENERATED schema layers (`wire/rev2025-11-25/buildSchemas.ts`, `rev2026-07-28`) keep old clients parsing while new methods ship.

## Unmined but noted

`client/auth.ts` (2,376 lines — full OAuth client: issuer mismatch discard, scope union computation, callback param resolution) and `streamableHttp.ts` transports (server 1,242 + client 1,250) are large enough to be their own future passes.
