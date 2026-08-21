# Pi Upstream Foundation — Deep Reference


# Pi Upstream Foundation

A deep reference for the upstream Pi coding-agent (Mario Zechner). MIT License. Branch `main`, commit 534bcbffb (2026-08-11). Root: `/mnt/hdd/utopia/inspo/pi-upstream`. Graph: 10204 nodes / 42377 edges. Packages: coding-agent (3267), ai (1175), tui (919), agent (685), session-backends (219), server (204), client (144), protocol (101). Boundaries: coding-agent->tui (316), coding-agent->ai (53), session-backends->agent (39). Two things to mine: the **agent loop** and the **compaction pipeline** (the sharpest context-management design in the set).

## Architecture

```
packages/agent/src/agent-loop.ts                         -> agentLoop / agentLoopContinue / runAgentLoop*
packages/agent/src/harness/compaction/compaction.ts      -> the full pipeline (shouldCompact, findCutPoint, generateSummary, compact)
packages/agent/src/harness/compaction/branch-summarization.ts -> branch navigation summarization
packages/agent/src/harness/compaction/utils.ts           -> file ops, serializeConversation, formatFileOperations
packages/agent/src/harness/session/                      -> Entry/Session tree (branch, compaction, message entries)
packages/coding-agent/src/core/settings-manager.ts       -> SettingsManager (save/markModified, fan-in 46)
packages/ai/src/models + model-catalog.ts                -> createProvider (40), flattenModelCatalog (39)
packages/coding-agent/src/modes/interactive/theme/theme.ts -> Theme.fg (fan-in 115)
```

## Primitive 1: the agent loop (packages/agent/src/agent-loop.ts)

Works with **AgentMessage** throughout; transforms to **Message[] only at the LLM call boundary**.

- `agentLoop(prompts, context, config, signal, streamFn)` — start with a new prompt message; added to context, events emitted. Returns an `EventStream<AgentEvent, AgentMessage[]>`.
- `agentLoopContinue(context, config, signal, streamFn)` — continue WITHOUT adding a new message (retries). Two guard errors, both important:
  - empty context -> "Cannot continue: no messages in context".
  - **last message role is assistant -> "Cannot continue from message role: assistant"**. The last message must convert to a `user` or `toolResult` via `convertToLlm`, or the LLM provider rejects the request. Cannot be validated here because `convertToLlm` only runs once per turn.
- Both push events to a sink and `stream.end(messages)` on completion.

**The lesson: separate start vs continue as two entry modes, and enforce the continuation precondition (last message is user/toolResult) at the boundary.**

## Primitive 2: branch summarization (branch-summarization.ts)

When the user navigates away from a branch and back, summarize what happened there.

- `collectEntriesForBranchSummary(session, oldLeafId, targetId)` — computes the **deepest common ancestor** between the previous leaf and the target, then collects the entries from oldLeafId up to (excluding) the ancestor, reversed to chronological order. Returns `{ entries, commonAncestorId }`.
- `getMessageFromEntry(entry)` — maps entry types to messages: `message` (role != toolResult), `branch_summary`, `compaction`; skips toolResult, thinking_level_change, model_change, active_tools_change, custom.
- `prepareBranchEntries(entries, tokenBudget=0)` — builds messages + a `FileOperations` set (read/edited), walking entries **reverse chronological** (newest first), estimating tokens per message, and **keeping the newest that fit the budget**. Special rule: a `compaction` or `branch_summary` entry near the budget edge is still included if totalTokens < 90% of budget (summaries are cheap and load-bearing). Returns `{ messages, fileOps, totalTokens }`.
- `generateBranchSummary(session, options)` — runs summarization with a structured prompt (BRANCH_SUMMARY_PROMPT with an EXACT format), producing `BranchSummaryResult { summary, usage?, readFiles, modifiedFiles }`. Options: models, model, signal, customInstructions?, replaceInstructions?, reserveTokens (default 16384), retry?, callbacks?.
- The branch summary is persisted as a `branch_summary` entry with `BranchSummaryDetails { readFiles, modifiedFiles }` — so file ops accumulate across nested summaries.

## Primitive 3: the compaction pipeline (compaction.ts)

**The decision:**
- `shouldCompact(contextTokens, contextWindow, settings)` — `enabled && contextTokens > contextWindow - reserveTokens`.
- `calculateContextTokens(usage)` / `estimateContextTokens(messages)` — token accounting.
- `getLastAssistantUsage(entries)` / `completeSimpleWithRetries` — usage + retry.

**The estimation heuristic (`estimateTokens(message)`):**
- user/toolResult/custom: chars/4.
- assistant: text + thinking + toolCall (name + args) chars/4.
- bashExecution: command + output chars/4.
- **Images estimated at `ESTIMATED_IMAGE_CHARS = 4800` chars** (~1200 tokens) — the conservative image cost.

**The cut (`findCutPoint(entries, startIndex, endIndex, keepRecentTokens)`):**
- Finds valid cut points, then walks **newest-to-oldest** accumulating tokens until `keepRecentTokens` is reached.
- Picks the cut point at/after that index, then **backs up past non-message entries** (compaction/message boundary) so the cut lands on a real turn boundary.
- Returns `{ firstKeptEntryIndex, turnStartIndex, isSplitTurn }` — `isSplitTurn` true when the cut splits a turn (cut entry is not a user message but a turn start was found).

**The summary + commit:**
- `generateSummary` / `generateSummaryWithUsage` — LLM summary of the dropped prefix.
- `prepareCompaction` — assembles what to keep (recent) + the summary message.
- `compact` — writes the compaction entry; the summary becomes a `compaction` entry with `tokensBefore`.

## How to use

- **When you need an agent loop** -> port `agent-loop.ts`: AgentMessage throughout, convertToLlm only at the LLM boundary, start vs continue as separate modes, enforce the continue precondition.
- **When you need context compaction** -> `compaction.ts`: shouldCompact (window - reserve) -> estimateTokens -> findCutPoint (keepRecent, turn-boundary-aware) -> generateSummary -> compact. Copy the image estimate (4800 chars) and the reverse-walk keep-recent logic.
- **When you need branch navigation summarization** -> `branch-summarization.ts`: common-ancestor collection, newest-first budgeted selection, summary entries with readFiles/modifiedFiles that accumulate.
- **When you need a settings manager** -> `SettingsManager` (save/markModified, fan-in 46).
- **When you need a model catalog** -> `flattenModelCatalog` + `createProvider`.

## Red Flags

- Continuing an agent loop when the last message is assistant (provider rejects).
- Compaction that cuts mid-turn (must respect turn boundaries via findTurnStartIndex).
- Token estimation that ignores images (a single image can be ~1200 tokens).
- Branch summarization that drops the common-ancestor context.
- Dropping a compaction/branch_summary entry near the budget edge (they're load-bearing; keep if <90% budget).

## Verification

- agentLoopContinue rejects an assistant last message.
- shouldCompact triggers exactly at window - reserveTokens.
- findCutPoint never leaves isSplitTurn with a lost turn start.
- Branch summary round-trips readFiles/modifiedFiles into the next prepare.

## Skill Result Contract

```xml
<skill_result>
  <skill>pi-upstream-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Harness pattern ported, provenance cited, checks run</evidence>
  <artifacts>Ported pattern + path</artifacts>
  <risks>Context loss, mid-turn cut, missing continue mode, or none</risks>
</skill_result>
```
