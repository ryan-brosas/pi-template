# Vercel AI SDK — Tool Calls Reference

Complete source-grounded reference for tool-call parsing, repair, and message pruning. Files: `generate-text/{parse-tool-call.ts` (226 lines, full), `prune-messages.ts` (196 lines, full), `execute-tool-call.ts`, repair wiring in `generate-text.ts`}.

## parseToolCall: repair hook with typed error routing

`parseToolCall` (full) implements a three-outcome flow:

1. Parse normally (provider-executed dynamic tools skip the local tool list).
2. On NoSuchToolError OR InvalidToolInputError, invoke the user's `repairToolCall` hook with the original call, tools, JSON schemas per tool, instructions, messages, and the typed error (:121 region). Repair failures wrap as ToolCallRepairError {cause, originalError} — BOTH errors preserved.
3. If repair returns null, the ORIGINAL error rethrows; if everything still fails, the call degrades to `{invalid: true, error, dynamic: true}` carrying parsed-when-possible input — "TODO AI SDK 6: special invalid tool call parts" admits this is interim shape.

Invalid inputs are never silently dropped: they become invalid tool-call parts the model can see and correct.

**Lesson:** route tool-call failures through a repair hook keyed by typed errors, preserve cause chains, and degrade to visible invalid parts rather than dropping calls.

## pruneMessages: referential-integrity-aware history pruning

`pruneMessages` (full) removes reasoning and tool content from history under a small DSL: `'all' | 'before-last-message' | 'before-last-N-messages' | none`, optionally scoped per TOOL NAME, with empty-message cleanup.

The hard problem is REFERENTIAL INTEGRITY: a `tool-approval-response` lives in a separate message from its request, so pruning the request orphans the response. The implementation builds GLOBAL maps (toolCallId→toolName across all messages, approvalId→toolName via callId lookup) before filtering:

> "These must be global (not per-message) because a tool-approval-response lives in a separate tool message from its tool-approval-request… Resolving names per-message left responses unresolved, which caused them to be kept while their request was pruned, producing orphaned approval responses."

Kept-window semantics: the last N messages are scanned FIRST to collect kept tool-call/approval ids; those ids survive pruning wherever they appear. Provider rule: assistant/tool roles with string content are untouched.

**Lesson:** pruning message history with tool references requires global id→name resolution maps and keep-set collection from the retained window BEFORE filtering — otherwise you orphan approvals and break provider validation.

**Probe:** prune with toolCalls=[{type:'before-last-3-messages', tools:['risky']}] keeps risky-tool parts inside the last 3 messages, removes them earlier, and never orphans an approval response whose request survived.

## execute-tools-from-stream: tools start while the model streams

`executeToolsFromStream` (246 lines) begins executing tool calls AS their inputs finish streaming (not waiting for response end), with execute-tool-call handling approval requests as first-class outcomes. Tool-input refinement hooks run post-parse pre-execute.

## generate-text.ts: the orchestrator

The 1,914-line orchestrator wires: standardizePrompt → per-step prepareStep → streamLanguageModelCall → executeToolsFromStream → stop-condition evaluation → toResponseMessages/toUIMessageStream, with retries (prepareRetries), download hooks, gateway error wrapping, and restricted telemetry dispatchers that strip sensitive fields before dispatch.
