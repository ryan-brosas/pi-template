# Pi Upstream — Session & Steering Reference

Source-grounded reference for the session layer touched by the compaction engine. Files: `packages/agent/src/session/types.ts` (Entry/CompactionEntry composites), `packages/agent/src/session/index.ts` (persistence), `packages/agent/src/session/context.ts` (session-context assembly), `packages/agent/src/harness/messages.ts` (createBranchSummaryMessage/createCompactionSummaryMessage), plus steering surfaces referenced from `packages/agent/src/agent-loop.ts`.

## Entries: durable and temporary by type

The type map lives in `packages/agent/src/session/types.ts`; persistence round-trips through `packages/agent/src/session/index.ts`.

`packages/agent/src/session/types.ts` models a session as an ordered entry list where every entry carries a parentId and the store persists ONLY durable types. Compaction entries store `{summary, tokensBefore, retainedTail, details}` — the retained tail rides ON the compaction entry rather than being appended as separate messages, so future compactions base their decision on the previous summary state, not on the pruned history (see internals.md prepareCompaction). Branch summaries store `{summary, fromId, timestamp, readFiles, modifiedFiles}` and are INERT from the model's perspective except as createBranchSummaryMessage context.

The persistence invariant pairs with an in-memory lookup helper (`getMessageFromEntry`) that rehydrates every entry type to An agent message — including the synthetic branch/compaction summary messages — so both the loop and the summarizer read one unified shape.

**Lesson:** persist what the FUTURE needs (summary + retained tail + file ops), not the pruned past; rehydrate synthetic entries into unified messages at the read boundary.

## Steering messages: snapshot-driven, never read my writes

Loop steering (`getSteeringMessages`) is snapshot-based: the callback receives the state as of the last prepared turn and returns messages to inject; anything typed while the assistant was mid-turn arrives through the NEXT steering read. This keeps a simple invariant — steering messages never interleave mid-token-stream — and lets the editor remain responsive even while the model streams. Resize events and variable-channel content flow through the same snapshot mechanism, which is why the loop's pendingMessages drain appears before the next assistant response.

**Lesson:** separate steering capture from steering application with versioned snapshots so user input can never interleave a half-streamed turn.

## Verification

The compaction engine, branch summarization, and loop continue-precondition are covered by the package's own test dir (compaction tests incl. cut-point/findTurnStart cases); session persistence round-trips the compaction entry retained-tail shape; steering drain order is observable via the double-loop in agent-loop.ts.
