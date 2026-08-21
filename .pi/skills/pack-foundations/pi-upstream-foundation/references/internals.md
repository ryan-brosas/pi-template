# Pi Upstream — Agent Loop & Compaction Internals

(Source-grounded; read in full: `packages/agent/src/harness/compaction/compaction.ts` (848 lines, key ranges), `packages/agent/src/harness/compaction/branch-summarization.ts` (280 lines), `packages/agent/src/agent-loop.ts` (modes/steering ranges).)

Source-grounded reference. Read in full: `packages/agent/src/harness/compaction/compaction.ts` (848 lines, key ranges), `branch-summarization.ts` (280 lines), plus `agent-loop.ts` modes/steering ranges (:25-95, :160-260).

## Agent loop: two modes, one enforced boundary

`agentLoop(prompts, …)` starts fresh; `agentLoopContinue(context, …)` resumes WITHOUT adding a message (retries). The continue mode throws on empty context and on a trailing assistant message (:64-80) — and the docstring records WHY it can't validate more: "the last message must convert to `user` or `toolResult` via convertToLlm… This cannot be validated here since convertToLlm is only called once per turn." The LLM boundary conversion happens once, at one place, so the guard can only check the cheap invariant.

**The lesson: AgentMessage throughout the harness; convertToLlm exactly once at the provider boundary; continue-mode preconditions enforced where they're checkable.**

### The double loop (:160-260)

Outer loop = follow-up messages queued after the agent would stop. Inner loop = tool calls + steering. Steering (`config.getSteeringMessages`) is drained at loop START (user typed while waiting) and again after every turn; pending steering messages are injected into context BEFORE the next assistant response.

Two hooks shape each turn: `prepareNextTurn(snapshot)` may swap context/model/thinkingLevel mid-run (returns a new snapshot), and `shouldStopAfterTurn` ends the run cleanly.

**Truncation safety**: a `"length"` stop reason means output hit the token limit, so EVERY tool call in that message may carry truncated arguments — all of them are FAILED (`failToolCallsFromTruncatedMessage`) rather than executed. Never execute calls you can't trust.

## Hybrid token estimation (:160-230 of compaction.ts)

`estimateContextTokens(messages)` refuses to guess blindly: find the LAST VALID assistant usage block (aborted/error/zero-usage excluded by `getAssistantUsage`), take its PROVIDER-reported totals, then char-heuristic only the TRAILING messages after it. Result: `{tokens = usageTokens + trailingTokens, lastUsageIndex}`. With no usage anywhere, fall back to pure estimation.

The char heuristic is `/4` chars-per-token per role, with **ESTIMATED_IMAGE_CHARS = 4800** per image block; assistant toolCall blocks count name + JSON-stringified arguments through `safeJsonStringify` (which returns `"[unserializable]"` rather than throwing).

## Compaction pipeline

- **Trigger**: `shouldCompact = enabled && contextTokens > contextWindow - reserveTokens`. Defaults: reserve 16384, keepRecent 20000.
- **Cut points** (`findValidCutPoints`): message entries whose role is anything BUT toolResult (cutting between a call and its result orphans the pair), plus branch_summary entries. Metadata entries (thinking_level_change, model_change, active_tools_change, prior compactions) are never cut points.
- **findCutPoint**: walk BACKWARD accumulating estimated tokens until ≥ keepRecentTokens, choose the first cut point at-or-after that index, then back up over any remaining non-message/non-compaction entries. If the chosen entry isn't a user message, `findTurnStartIndex` walks back to the turn's opening user/bashExecution/branch_summary → `isSplitTurn` — a turn may be split, but the prefix is summarized SEPARATELY (`turnPrefixMessages`) so the retained tail still begins at a turn boundary.
- **Summaries are standalone requests**: `completeSimpleWithRetries` forces `cacheRetention: "none"` and a fresh `uuidv7()` session id — no routing pollution, no unusable cache writes. Summary budget: `maxTokens = min(0.8 × reserveTokens, model.maxTokens)`.
- **Structured prompts**: system prompt says "Do NOT continue the conversation… ONLY output the structured summary." Body enforces an exact section format (Goal / Constraints / Progress-Done-In Progress-Blocked / Key Decisions / Next Steps / Critical Context) and repeats "Preserve exact file paths, function names, and error messages" in both create and UPDATE variants. The update variant feeds `<previous-summary>` and mandates PRESERVE-and-ADD semantics so iterative compaction doesn't lose earlier facts.
- **File-op memory**: `extractFileOperations` merges file reads/writes from the summarized range WITH those recorded on the PREVIOUS compaction entry's `details` — file history ACCUMULATES across successive compactions instead of resetting. Stored as `CompactionDetails {readFiles, modifiedFiles}`.

## Branch summarization (navigation, not compaction)

When the user jumps to a different session-tree entry: `collectEntriesForBranchSummary` computes both root paths, finds the deepest COMMON ANCESTOR, then walks parent pointers from the old leaf down to it and REVERSES to chronological order — exactly the abandoned exploration gets summarized, nothing shared.

`prepareBranchEntries(entries, budget = contextWindow − reserveTokens)` selects NEWEST-FIRST (walk backward, unshift), skipping toolResults, with a 90% RULE: when the budget would overflow, prior `compaction`/`branch_summary` entries are still included if total stays under 90% of budget — dense summaries earn their place over raw messages.

Output wraps the structured summary in a preamble ("The user explored a different conversation branch before returning here") and APPENDS the formatted file-operation lists — so returning to the trunk knows what the detour read and modified.

**The lessons: compaction needs safe-cut invariants (never orphan tool results, respect turn boundaries, split turns summarized separately), provider-truth-plus-heuristic token estimation, standalone cache-isolated summary calls, accumulate-don't-reset file history, and branch switches that summarize only the divergent path.**
