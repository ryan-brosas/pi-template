# Roo-Code — Approvals, Repetition Guards & Checkpoints Reference

Files read in full: `src/core/auto-approval/index.ts`, `src/core/auto-approval/tools.ts`, `src/core/auto-approval/commands.ts`, `src/core/auto-approval/mcp.ts`, `src/core/tools/ToolRepetitionDetector.ts`, and the checkpoint base `src/services/checkpoints/ShadowCheckpointService.ts`.

## Auto-approval as a PURE decision function

`checkAutoApproval({state, ask, text, isProtected})` returns a four-way decision — approve / deny / ask / TIMEOUT-with-resume-fn — as a pure function over extension state (:24-56). Categories map to state flags (alwaysAllowReadOnly/Write/Mcp/ModeSwitch/Subtasks/Execute/FollowupQuestions) with qualifier options (outside-workspace, protected files, allowed/denied command lists).

Two decisions stand out:

- **Followup questions can auto-answer on TIMEOUT**: if alwaysAllowFollowupQuestions and a timeout is configured, the decision returns `{decision:"timeout", timeout, fn}` where fn answers with the FIRST SUGGESTED option — the human gets the window to respond, then the agent takes the model's own suggestion rather than hanging.
- **MCP tools require per-server/per-tool always-allow lists** (`isMcpToolAlwaysAllowed`), not a blanket flag.

Non-blocking asks short-circuit to approve; disabled auto-approval short-circuits to ask.

**Lesson:** make approval logic a pure classifier returning decisions (including timed-auto-answer closures) — UI, tests, and policy tuning all consume the same function.

## Tool repetition detector: canonical serialization + reset-on-block

`ToolRepetitionDetector` (:1-70, read in full) fights stuck loops: serialize each ToolUse to canonical JSON via safe-stable-stringify ({name, params, nativeArgs?}), count consecutive IDENTICAL calls, and at the limit (default 3) BLOCK execution and ask the user ("mistake_limit_reached"). Crucially, the counters RESET on block:

> "Reset counters to allow recovery if user guides the AI past this point"

so the user's guidance re-enables the tool rather than leaving a permanent ban. Serialization includes nativeArgs only when non-empty, keeping comparisons stable across parser variants.

This pairs with the Task-level consecutiveMistakeLimit (see task-loop.md): repetition guards per-tool-shape, mistake limits per-turn-quality.

**Lesson:** detect doom-loops by canonical-JSON identity of consecutive calls, block at threshold, and RESET on human intervention so guidance re-enables progress.

**Probe:** feed check() the same serialized call 3× → third returns allowExecution:false with askUser set; a different call between resets the count.

## Checkpoints: shadow git per task

`RepoPerTaskCheckpointService extends ShadowCheckpointService` — one shadow git repo PER TASK under `<shadowDir>/tasks/<taskId>/checkpoints`, with worktree pointed at the real workspace (initShadowGit requires "core.worktree to be set in the shadow git config", failing loudly otherwise: "Checkpoints require core.worktree to be set"). Same family as opencode's snapshot system (see opencode-foundation/references/snapshot.md) — shared object-store tricks apply there too.

## The webview ask/say protocol

Task communicates with the UI through two primitives: `say(kind, text, …)` (non-blocking narration: api_req_started with spinner, tool announcements, user_feedback) and `ask(kind, text)` (blocking: tool approval, mistake_limit_reached, followup, plan_respond). AskIgnoredError exists because asks can be IGNORED by the UI (user walked away) — callers must handle that path. Auto-approval integrates at the ask layer: checkAutoApproval decides BEFORE the ask reaches the webview, and timeout decisions carry their own resume closure.
