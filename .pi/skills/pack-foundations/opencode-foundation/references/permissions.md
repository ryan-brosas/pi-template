# OpenCode — Permission Model Reference

Source-grounded reference for `packages/opencode/src/permission/index.ts` (223 lines, read in full).

## WHAT: ruleset-evaluated, Deferred-suspended tool approvals

Tool calls declare a permission name + patterns; config rulesets decide allow/deny/ask per pattern. "Ask" SUSPENDS the tool call as a pending request surfaced to clients; the human reply resolves it.

## WHERE
`evaluate` :30-37, ask loop :74-105, pending/Deferred :107-124, reply :126-163, finalizer :56-64.

## WHY each decision

- **findLast wins** (:30-37): rule layers (user config → project config → session approvals) append; the LAST matching rule is authoritative — later, more specific configuration naturally overrides earlier. Default when nothing matches: `{action: "ask", pattern: "*"}` — fail toward asking, never toward allowing.
- *Deny short-circuits WITH the matching ruleset* (:84-89): DeniedError carries the filtered ruleset so the model/UI can explain WHICH rule refused.
- *One ask pattern suspends everything*: any pattern evaluating to ask creates ONE pending request covering all patterns (:90-96) — no partial allows leaking mid-request.
- *Suspension = Effect Deferred*: the tool call literally awaits the human; shutdown finalizer fails ALL pending with RejectedError so nothing hangs (:56-64).
- *Rejection is FEEDBACK*: reply "reject" with a message fails the deferred with `CorrectedError({feedback})` (:144-150) — the model receives the human's correction as an error it can act on, not just a stop sign.
- *Rejection cascades within the session* (:151-160): other pending requests in the SAME session also reject — a human stopping one action clearly intends to stop the batch.
- *Approvals accumulate*: approved replies append to `approved` ruleset, making later evaluates findLast-match them — "always allow" is implemented as ruleset growth, not a side-channel.
- *Events on both edges*: Asked/Replied published over the event bridge — every client surface (TUI, web, desktop) sees identical permission state.

## HOW
Wildcard matching on permission name AND pattern (`Wildcard.match`); request carries optional `always` flag and tool identity for UI rendering; `PermissionV1.ID.ascending()` orders pending requests fairly.

## The lessons
1. Permission systems should fail toward ASKING, carry their reasons (matching rules) in errors, and treat rejection text as model feedback.
2. Layered rules resolve last-wins; session approvals are just more layers.
3. Suspend-and-resume via deferreds keeps tool semantics synchronous while humans think.
