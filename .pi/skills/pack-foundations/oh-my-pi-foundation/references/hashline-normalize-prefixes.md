<!-- capsule-v1 -->
# Hashline normalize + prefix seams — shape round-trip, echoed-input stripping

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/hashline/src/normalize.ts`, `prefixes.ts`.

## Text-shape canonicalization (BOM + line endings)
**Path/Symbol:** `normalize.ts:detectLineEnding`, `normalizeToLF`, `restoreLineEndings`, `stripBom`.
**Signature:** `detectLineEnding(content): "\r\n" | "\n"` (first-ending wins, LF when neither); `normalizeToLF(text)` replaces `\r\n?`; `restoreLineEndings(text, ending)`; `stripBom(content): { bom, text }`.
**Data Shape:** strings + `LineEnding` union; BOM stripped once at the front, kept for write-back.

### Decisive source
```ts
const crlfIdx = content.indexOf("\r\n"); const lfIdx = content.indexOf("\n");
… crlfIdx < lfIdx ? "\r\n" : "\n"
export function normalizeToLF(text) { return text.replace(/\r\n?/g, "\n"); }
export function stripBom(content) { /* \uFEFF prefix → {bom, text} */ }
```

**Flow:** before applying edits, content is BOM -stripped and normalized to LF so line anchors are stable; the detected `LineEnding` and BOM are re-applied exactly on write-back so a CRLF file stays CRLF and a BOMed file keeps its BOM through patch + write. Patch math happens entirely in LF-space.

**Invariant:** write-back restores the original shape, not the patcher's shape; BOM is resolved at capture time, never inferred at write time.

## Echoed-prefix stripping (read output → patch input)
**Path/Symbol:** `prefixes.ts:stripNewLinePrefixes`, `stripHashlinePrefixes`; `HL_PREFIX_RE`, `HL_HEADER_RE`, `DIFF_PLUS_RE`.
**Signature:** `stripNewLinePrefixes(text): string` (opportunistic); `stripHashlinePrefixes(text): string` (strict — every non-empty line must be hashline-prefixed).

### Decisive source
```ts
const HL_PREFIX_RE = /^\s*(?:>>>|>>)?\s*(?:[+*-]\s*)?\d+[:|]/;
const DIFF_PLUS_RE = /^[+](?![+])/;
```

**Flow:** runs *before* the tokenizer — a model echoing `read`/`search` output as a patch emits `123:`/`123|` numbered lines (hashline mode) or `+` diff echoes (non-hashline). Opportunistic strips when input clearly carries these prefixes and leaves plain text alone; strict strips only when every non-empty line is numbered. Reader elision notices are also recognized so truncated echoes never become malformed ops.

**Invariant:** stripping is deterministic and idempotent — un-echoed text loses nothing; no stray echoed line prefix becomes a fake op.

**Probe:** `test/core-contracts.test.ts`, `test/leniency.test.ts`, `test/format-v2.test.ts`, `test/clipboard.test.ts`, `test/boundary-repair.test.ts`.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(detectLineEnding|restoreLineEndings|stripBom|stripNewLinePrefixes|stripHashlinePrefixes)$", limit: 8, fields: ["signature"] });
```
