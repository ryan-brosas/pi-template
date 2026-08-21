# MCP TS SDK — Streamable HTTP Transport Reference

(Source-grounded; read in full: `packages/server/src/server/streamableHttp.ts` (1,242 lines) and `packages/client/src/client/streamableHttp.ts` (1,250 lines).)

Complete source-grounded reference for the transport pair. Files: `packages/server/src/server/streamableHttp.ts` (1,242 lines) and `packages/client/src/client/streamableHttp.ts` (1,251 lines), both read in full.

## Session lifecycle: mint-once, adopt-from-handshake, 400-vs-404 asymmetry

The server mints `Mcp-Session-Id` only while handling `initialize` (:793-812), sets `_initialized`, and awaits `onsessioninitialized` BEFORE any session validation runs for that request. Re-initialization is rejected 400 -32600 ("Server already initialized"), as are batched initializations. Everything else passes `validateSession` (:998-1038), whose asymmetry encodes spec semantics:

- missing header → **400 -32000** "Mcp-Session-Id header is required" — a malformed request, a client bug;
- wrong id → **404 -32001** "Session not found" — state gone.

Stateless mode (`sessionIdGenerator` undefined) skips validation entirely. The client deletes the header for handshakes and adopts the returned id ONLY when `isHandshake && response.ok` (:1010-1013) — "a sessionless handshake clears any stale id." `terminateSession()` treats 405 as success ("the server does not support explicit session termination") and clears local state regardless.

**Lesson:** treat session ids as initialize-scoped state — mint once, adopt only from a successful handshake, distinguish missing (400) from unknown (404), make DELETE idempotent.

**Probe:** POST initialize twice → second is 400 -32600; GET with stale id → 404; GET with no header post-init → 400.

## Resumability: store-first, version-gated priming events

Resumability activates only when an `eventStore` is configured. Two rules matter:

**Store before delivery.** In send(), the event lands in the event store BEFORE checking whether a live SSE writer exists (:1144-1172):

> "Storage is keyed on request-in-flight… not on whether a live SSE writer currently exists… Per 2025-11-25 transports.mdx, disconnection SHOULD NOT be interpreted as the client cancelling its request."

Events emitted while a stream is disconnected are therefore replayable on Last-Event-ID reconnect.

**Gate wire additions by exact version membership.** Priming events (`id: <id>\nretry: <ms>?\ndata: \n\n` — deliberately empty data) go only to clients whose protocol version passes `supportsEmptySSEData` (:405-455). The gate is a conjunction with a listed-membership check, and the comment explains why a range check would be wrong: the version "may come from an initialize request body, which (unlike the MCP-Protocol-Version header) is not validated against supportedProtocolVersions before reaching this check. An unknown future version string must not silently enable behavior reserved for versions this transport actually supports." Older clients choke on empty-data events (:437-441).

Replay resolves the stream via replayEvents + replayEventsAfter and registers it under a REPLAYED stream id; the client emits each received id upward via `onresumptiontoken` (:759) and sends `last-event-id` on reconnect (:553-555).

**Lesson:** make resumability additive — gate wire-format changes behind exact-version predicates, persist events before attempting delivery, and key storage on the logical request rather than any socket's liveness.

**Probe:** streamableHttpFutureVersionGates.test.ts:114 asserts NO priming event for `2099-01-01`; :815/:916 cover Last-Event-ID reconnect after closeSSEStream and 200-not-409 on repeated resume tokens.

## GET semantics: one listen stream, identity-checked teardown

GET opens the session's single standalone stream under the sentinel id `_GET_stream` (:249); a concurrent second GET is rejected **409** "Only one SSE stream is allowed per session" (:485-491).

Every ReadableStream cancel closure deletes its mapping only if the stored controller still IDENTITY-matches — the same guard appears three times (:503-512 standalone, :597-609 replay, :888-897 per-request POST):

> "Only drop the mapping when it still points at THIS controller — a stale cancel must not delete a successor stream registered by a later GET/resume." (:506-508)

The race is real because cancel fires asynchronously while a reconnect may have re-registered the same key. Replay additionally closes-and-unregisters finished per-request streams when no in-flight request targets them anymore, so "a later reconnect isn't refused with 409" — while the standalone GET stream, never being request-scoped, stays open (:654-663).

**Lesson:** when a map entry can be replaced between an async callback's registration and firing, never delete by key alone — compare the stored resource by identity so a superseded object's teardown cannot destroy its successor's registration.

**Probe:** :916 (repeat Last-Event-ID reconnect gets 200 after retired-stream cleanup); middleware test :643 asserts the 409 body for double GET.

## Client reconnect: a predicate over provenance, completion, and intent

After an SSE stream ends, the client reconnects only if:

- **provenance**: the stream was inherently resumable (standalone GET) OR a priming event with an id arrived (`canResume = isReconnectable || hasPrimingEvent`);
- **incompletion**: no JSON-RPC response of EITHER kind received yet — errors count as completion (:772-774);
- **intent**: no transport close and no per-request abort — intentional aborts suppress BOTH onerror and reconnection (:726-729): "no misleading 'SSE stream disconnected' onerror, and no GET+Last-Event-ID reconnect that would resurrect a stream the caller just tore down." The catch branch agrees (:833-835): "The reader threw because we aborted it. Not an error."

Backoff honors the server's SSE `retry:` field first, then grows 1000ms × 1.5 up to 30s with maxRetries=2 (:46-51); backoff re-checks BOTH abort signals before firing (:684-686). Retry exhaustion is terminal and announces itself through `onRequestStreamEnd?.()` — one deterministic end-of-stream callback so callers don't infer settlement from absent events (:671-674). Resumed responses get their ids remapped onto the new request id (:775-777).

**Lesson:** encode reconnection as an explicit predicate over stream provenance, completion (any JSON-RPC response counts), and intent (abort means silence) — plus one deterministic end-of-stream callback for callers.

**Probe:** :1298 reconnect-after-priming-event; :1468/:1607 pin the no-reconnect path for unprimed POST streams; :2423-2461 verifies Last-Event-ID sent after a retry-field priming event.

## Verification

Test surfaces: `test/server/streamableHttp.test.ts` (session/replay/409 paths), `test/server/streamableHttpFutureVersionGates.test.ts` (priming gates), `test/client/streamableHttp.test.ts` (reconnect matrix and parses).

## Content negotiation: substring Accept, essence-parsed Content-Type, drained error bodies

POST requires Accept containing BOTH `application/json` and `text/event-stream` (406 otherwise) and a JSON Content-Type (415). The asymmetry is documented (:744-746): "Accept is a comma-separated list, so a substring check is the intended semantics here (unlike Content-Type below)" — which uses `mediaTypeEssence()` parsing, defeating spoofed values like `text/event-stream-x`. Notifications-only POSTs short-circuit to bare 202 before any stream allocation.

The client UNIONS user-supplied Accept with required types and dedupes (:984-988), dispatches 200-with-requests responses on parsed media type (:1119-1140), and DRAINS error-path response bodies (`await response.text?.().catch(() => {})`) so connections stay reusable — applied on every error path in the file.

**Lesson:** negotiate with the right parser per header — lists tolerate substring presence, singular values demand essence parsing — and always drain bodies on error paths.

**Probe:** Accept without event-stream → 406; `Content-Type: text/plain` → 415; notifications-only valid POST → 202 empty.

## Protocol-version headers: three tiers and reserved names

Server-side, a PRESENT `MCP-Protocol-Version` header must be in the supported list (400 otherwise, message listing versions); ABSENT means inherit the negotiated default (:1040-1060). Validation skips initialize entirely — negotiation owns unknown versions there.

Client-side, per-request headers may NOT override six RESERVED names (:278-297): authorization, mcp-session-id, mcp-protocol-version, mcp-method, mcp-name — because "a per-request override would let a caller produce a header/body disagreement the server's SEP-2243 cross-checks reject." Modern-era envelope claims flip the polarity: a `_meta[PROTOCOL_VERSION_META_KEY]` claim DERIVES mcp-protocol-version/mcp-method/mcp-name FROM THE BODY (:455-520), with non-ASCII names sentinel-encoded so Headers.set can't throw or silently normalize (:498-503). And the modern behavior of surfacing HTTP 400 as JSON-RPC errors is compatibility-gated (:1078-1087): legacy exchanges keep getting SdkHttpError status 400 "exactly as before — existing callers do not silently stop matching."

**Lesson:** keep protocol-version handling three-tiered — negotiate at initialize, validate strictly afterward, inherit silently when absent — and derive per-message headers from the body behind reserved-name protection rather than letting callers inject disagreements.

**Probe:** `mcp-protocol-version: 1999-01-01` → 400 listing supported versions; absent header accepted post-init; options.headers={'mcp-session-id': …} dropped at :992-997.
