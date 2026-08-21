# MCP TS SDK — Protocol Internals Reference

Source-grounded reference for the dual-era protocol core (read in full during the deep pass). Files: `packages/core-internal/src/shared/protocol.ts` (:1-130 head + structure), `packages/core-internal/src/shared/inboundClassification.ts` (:1-110, full docstring), wire layout survey.

## Verification

The ladder is covered by decision-table unit tests inside `packages/core-internal/src/shared/inboundClassification.ts`, plus conformance-suite cells referenced in the docstring; correlation maps are exercised by protocol test harnesses under the core-internal package.

## The inbound ladder: two protocol eras on one endpoint

Servers that must accept OLD (2025-era) and NEW (2026-era) protocol clients on ONE endpoint need a body-primary classifier evaluated ONCE at the HTTP entry, returning plain routing values — `inboundClassification.ts` never throws and never touches a transport. Four rules govern it:

- **Body beats headers**: `initialize` is legacy by definition UNLESS its `_meta` carries a valid modern-revision envelope claim — and then the modern era answers method-not-found like any unknown method. The `MCP-Protocol-Version` HEADER is only a cross-check: it can never upgrade or downgrade a body-derived classification.
- **Malformed claims never fall back silently**: an envelope present but invalid is a validation error, not legacy traffic — silent fallback would let a broken modern client execute as legacy.
- **Header/body disagreement is explicit**: `-32020 HeaderMismatch` on HTTP 400, matching the published conformance suite cells (assignments cite their source and carry a `settled` flag for provisional cells).
- **Batches classify element-wise**: one modern-claiming or invalid element rejects the array; all-legacy arrays pass unchanged; single-element arrays stay arrays.

Legacy routing outcomes deliberately carry NO MessageClassification — hand-wired traffic dispatches byte-identically. Notifications-POST header rules are undefined in the spec; applying request rules symmetrically is labeled an SDK-defensive posture (keeps custom-notification POSTs' -32020 cells passing).

**Lesson:** when two protocol eras share an endpoint, make classification body-primary with headers as cross-checks only, reject malformed claims loudly, and keep legacy dispatch byte-identical.

## The Protocol base class: per-id correlation machinery

`Protocol<ContextT>` (protocol.ts:558) is extended by both Client and Server. The correlation maps (`_responseHandlers`, `_progressHandlers`, `_timeoutInfo` per request id) plus base-registered `notifications/cancelled` and `notifications/progress` handlers (:612-618) provide the plumbing.

The timeout design deserves porting verbatim:

- `resetTimeoutOnProgress` lets long operations keep a SHORT per-progress timeout instead of one huge blanket; `maxTotalTimeout` bounds the total so a chatty progress stream can't extend forever (:117-130).
- `enforceStrictCapabilities` checks REMOTE advertised capabilities before emitting requests, defaulting false "for backwards compatibility with SDK versions that did not advertise correctly" (:75-82) — local capability mismatches remain hard logic errors.
- Listed notification methods coalesce within one event-loop tick (:83-89) — repeated tools/list_changed storms collapse.

Wire eras are CODECS: `codecForVersion` / `bootstrapOutboundCodec` / `classifiedWireEra` select per-revision GENERATED schema layers (`wire/rev2025-11-25/buildSchemas.ts`, `wire/rev2026-07-28/buildSchemas.ts`), keeping old clients parsing while new methods ship.

**Lesson:** request correlation = per-id maps + dual-timeout semantics (reset-on-progress, hard-max-total) + opt-in remote-capability enforcement + tick-coalesced notifications.
