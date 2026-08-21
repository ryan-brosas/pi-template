# Billion-Context-Pi Foundation — Deep Reference


# Billion-Context-Pi Foundation

A deep reference for billion-context-pi (ranxianglei). MIT License. Branch `master`, commit 558a83a (2026-08-12). Root: `/mnt/hdd/utopia/inspo/billion-context-pi`. Graph: 405 nodes / 1005 edges. Small, focused, and the sharpest **long-context delegation** design in the set: subagent spawning with a restricted tool allowlist, message-range compression, and a watchdog that guarantees a hung child dies.

## Architecture

```
src/delegate-tool.ts      -> spawn child pi processes as subagents; the roster (reviewer/researcher/worker/planner/oracle); ACP tools auto-appended
src/delegate-events.ts    -> parse child event stream: parseEventLine, activityLines, newPortion, ThinkingCollector
src/delegate-watchdog.ts  -> attachWatchdogs: idle timer + hard timeout + EOF grace + SIGTERM->SIGKILL
src/compress-tool.ts      -> compress: replace message ranges with dense summaries (startId/endId/summary)
src/decompress-tool.ts    -> decompress: restore a compressed range from its summary
src/tool-guardrails.ts    -> capToolOutput + resolveBashTimeout + detectBashTimeout + appendTimeoutNotice
src/fleet-widget.ts       -> delegate status widget in the TUI (refresh 500ms, task truncated to 48 chars)
src/search-tool.ts / search-index.ts -> search_context over the session
src/status-tool.ts        -> acp_status
src/tokens.ts             -> estimateTokens, collectCoveredMessageIds
src/compat.ts             -> normalizeSystemPrompt, formatSystemPromptForEvent (omp compatibility)
src/config.ts             -> resolveConfig, DEFAULT_TOOL_BASH_TIMEOUT, DEFAULT_TOOL_OUTPUT_MAX_BYTES
src/setup-subagent-tools.ts -> register the subagent tool set
```

Boundaries (graph): delegate-tool->log (12), src->log (8), delegate-tool->delegate-events (4), delegate-tool->user-config (3), tool-guardrails->log (3). Hotspots: user-config join (13), log.event (11), logInfo (10), extractText (4).

## Primitive 1: the delegate roster + restricted tools (delegate-tool.ts)

**Constants:** MAX_DEPTH=2, SYNC_TIMEOUT_MS=5min, EOF_GRACE_MS=10s, IDLE_GRACE_MS=5min, ASYNC_TIMEOUT_MS=30min, KILL_GRACE_MS=10s, RESULT_SUMMARY_CHARS=500, OUT_DIR=tmpdir/acp-delegate.

**ACP_TOOLS** = ["compress", "decompress", "search_context", "acp_status"] — every restricted delegate KEEPS these so it can manage its own context.

**RESTRICTED_TOOLS** = "read,bash,grep,find,ls" — the read-only allowlist for reviewer/researcher/planner.

**The roster (AgentDef: prompt + tools + restricted?):**
- reviewer: read-only, cite file:line for every finding, never modify.
- researcher: read-only, exact file:line + signatures + snippets.
- worker: tools "read,edit,write,bash" (NOT restricted — runs on Pi's full toolset, so primary-task delegation is not degraded).
- planner: read-only, ordered step-by-step plan with rationale + file:line.
- oracle: read-only.

**The lesson: delegation = a named roster with per-role tool allowlists, read-only roles get a strict allowlist, the implementer role keeps full tools, and every delegate retains the context-management tools (compress/decompress/search/status).**

## Primitive 2: the watchdog (delegate-watchdog.ts)

`attachWatchdogs(child, hooks, opts)` guarantees a hung child dies:
- **Idle timer** (no stdout for idleMs) — the MAIN defense, because a stuck child holds its stdout fd open, so EOF never fires.
- **Hard timeout** (timeoutMs).
- **EOF grace** (eofGraceMs) — stdout EOF passed but process didn't exit; force-finalize.
- **Kill escalation**: SIGTERM, then SIGKILL after killGraceMs.
- `poke()` re-arms the idle timer on every stdout data; `dispose()` clears all timers on finalize.
- Hooks: isSettled() (watchdogs stop firing once settled), onKill(reason), onEofGrace().

**The lesson: a spawned child that can hang needs idle-timeout (not just a hard timeout) because a stuck process holds stdout open and EOF never fires.**

## Primitive 3: compress/decompress (compress-tool.ts, decompress-tool.ts)

- `compress({ topic?, content: [{ startId, endId, summary, topic? }] })` — replace older message ranges with dense summaries. Ranges addressed by message refs ("m00005") or block ids ("b3"). Batch multiple unrelated ranges in one call, each with its own topic.
- `summaryMaxChars` override (default max 20000 chars) — "don't lose critical info just to fit the limit".
- Prompt guidelines: write dense self-contained summaries — preserve file paths, signatures, errors, decisions verbatim; **never compress content the current step is actively using**.
- `decompress` — restore a compressed range from its summary.
- `estimateTokens` / `collectCoveredMessageIds` (tokens.ts) back the accounting.

## Primitive 4: tool guardrails (tool-guardrails.ts)

- `capToolOutput(content, maxBytes)` — caps combined text at DEFAULT_TOOL_OUTPUT_MAX_BYTES, keeps a head slice + a cap notice naming the dropped bytes (and fullPath). Non-text parts preserved.
- `resolveBashTimeout(input, defaultTimeout)` — applies DEFAULT_TOOL_BASH_TIMEOUT only when the input doesn't specify one.
- `detectBashTimeout` — parses "Command timed out after N seconds" from output.
- `appendTimeoutNotice` — adds a timeout notice.
- **Vendored `isBashToolResult`** (just `e.toolName === "bash"`) instead of importing pi's export — because omp's compat bundle doesn't export it, and a missing named export fails the whole module at load. **The lesson: vendor tiny predicates when a compat target may not export them.**

## Primitive 5: fleet widget (fleet-widget.ts)

- TUI status widget: `acp_delegate · N running`, one row per delegate `● agent (Ns) — task` (task truncated to 48 chars, newlines collapsed).
- Refresh every 500ms; only re-renders when the render key changes (agent + elapsed bucket + truncated task).

## How to use

- **When you need subagent delegation** -> the roster + restricted-tools pattern: named AgentDefs, read-only roles on "read,bash,grep,find,ls", implementer keeps full tools, ACP context tools auto-appended.
- **When you need to guarantee a spawned child dies** -> attachWatchdogs: idle timer (main), hard timeout, EOF grace, SIGTERM->SIGKILL.
- **When you need message-range compression** -> compress/decompress with mNNNNN refs + dense summaries; never compress live content.
- **When you need to cap tool output** -> capToolOutput with a named dropped-bytes notice.
- **When you need a live delegate status widget** -> fleet-widget (500ms refresh, render-key diffing).

## Red Flags

- Delegation without a watchdog (a stuck child holds stdout open; EOF never fires).
- A read-only role with write tools.
- Compressing content the current step is actively using.
- Capping output without naming the dropped bytes.
- Importing a named export a compat target may not provide (vendor the tiny predicate).

## Verification

- A hung child is SIGKILLed after the idle grace + kill grace.
- A restricted delegate cannot call edit/write.
- compress replaces the exact range; decompress restores it.
- Cap notice names the dropped byte count.
- The widget shows running delegates and stops after settle.

## Skill Result Contract

```xml
<skill_result>
  <skill>billion-context-pi-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Delegation pattern ported, provenance cited, verified</evidence>
  <artifacts>Delegate roster + watchdog + compress</artifacts>
  <risks>Hung child, leaked tools, live-content compression, or none</risks>
</skill_result>
```
