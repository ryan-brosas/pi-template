# Billion-Context-Pi — Compression Reference

Source-grounded reference for the compress/decompress pair. Files: `src/compress-tool.ts` (126 lines), `src/decompress-tool.ts` (213 lines), `src/tokens.ts`, `src/state.ts` — all read in full. Graph: cluster 0 (`handleCompress/estimateTokens/collectCoveredMessageIds`) cohesion 0.594.

## WHAT: compress is a thin wrapper

`makeCompressTool(runtime)` validates ranges, then hands off to `runtime.core.applyCompression({ranges, messages, state, config})` (`compress-tool.ts:88-95`) — the block/tier engine lives in **acp-kernel**, not here. State (`state.ts`): blocks carry `blockId`, `tier`, `summary`, `directMessageIds`, `effectiveMessageIds`, `active`; persisted next to the session as `<session>.acp.json` via tmp-file + rename (atomic), with a forward-compatible `mergeInitialState` that backfills fields older state files lack.

Ranges are addressed by message ref (`"m00005"` — each message carries an acp tag with ref/token-size/type) or block id (`"b3"`). Batch multiple unrelated ranges in one call; per-range `errors`/`warnings` mean PARTIAL SUCCESS — one bad range doesn't abort the batch.

Token accounting (`tokens.ts`): `estimateTokens` skips messages emitted by the compress tool itself AND every id in active blocks' `effectiveMessageIds` — it measures LIVE uncovered context only. Result line: `▣ ACP | 12.3K → 4.5K tokens (~7.8K reclaimed, 2 blocks)`. Debug events `compress-in/out` record every span for diagnosis.

Prompt guidelines baked into the tool: dense self-contained summaries preserving paths/signatures/errors verbatim; never compress content the current step is using.

## WHERE: decompress restores from the SESSION LOG, not the block

Blocks store only summary + refs. Original text lives in pi's append-only session log; `findMessageContent(ref)` (`decompress-tool.ts:99-109`) scans `sessionManager.getEntries()` for the matching CoreMessage id.

- **Dual addressing**: arg resolves as message-ref FIRST (data-driven: found in some block's `effectiveMessageIds`), block-id second — ordering matters because pure-digit hex UUIDs would misparse as block numbers (:155-160 comment).
- **Size-appropriate defaults**: block decompress → auto-generated file (`~/.cache/pi/acp-decompress/b5-<ts>.txt`, timestamped so repeats never overwrite) + 600-char head preview; message decompress → inline by default, file when ≥2000 chars (`MESSAGE_INLINE_THRESHOLD`).
- **The block STAYS compressed** — restore-to-file never touches live context or disrupts the prompt cache prefix. `inline:true` is an explicit opt-in to context cost.
- `toFile` paths are jailed to `/tmp`, `~/.cache/opencode`, `~/.cache/pi` via a `relative()` containment check (:67-80).
- `full:true` recurses nested block tiers down to original messages.

**The lessons: compression keeps an addressable trail (refs + summaries + covered-id sets); restoration defaults to files with previews so context only grows by explicit choice; and the source of truth for original content is the append-only log, not the compressed layer.**
