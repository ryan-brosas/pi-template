<!-- capsule-v1 -->
# Hashline — apply model edits purely, then let syntax be judge

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Question:** How do you turn a line-anchored edit language into a sound file edit without letting a dry-run or repair pass second-guess the author?

## One pure pass materializes; syntax is the only judge
**Path:Symbol:** `packages/hashline/src/apply.ts:applyEdits` (1315) → `materializeEdits` (1243); `packages/hashline/src/block.ts:resolveBlockEdits` (61).
**Signature:** `applyEdits(text: string, edits: readonly Edit[], options?): ApplyResult { text, firstChangedLine?, warnings? }`.
**Data Shape:** LF lines; edits binned into bof/eof/after-anchor buckets with line origins; parse-result booleans (`baselineParses`, `authoredParses`).

### Decisive source
```ts
const appliedEdits: AppliedEdit[] = [];
for (const edit of concrete) {
  if (edit.kind === "block") throw new Error(UNRESOLVED_BLOCK_INTERNAL);
  if (edit.kind === "cut" || edit.kind === "paste") throw new Error(UNRESOLVED_CLIPBOARD_INTERNAL);
}
const landed = repairAfterInsertLandings(targetEdits, fileLines, options.path);
const normalized = normalizeTextualBoundaryEchoes(landed.edits, fileLines, options.path);
const authored = materializeEdits(fileLines, normalized.edits);
const baselineParses = parsesCleanly(options.path, text);
const authoredParses = parsesCleanly(options.path, authored.text);
if (authoredParses) { if (ambiguity) throw ...; return finish(authored, leading); }
const repaired = repairBoundaryVariants(...); // only when authored failed to parse
```

**Flow:** partition edits by cursor (bof/eof/anchor) → bucket by line → apply bottom-up so earlier indices stay valid → track `firstChangedLine` (1-indexed) → normalize boundary echoes (indentation + textual) → author materialization wins UNLESS it stopped parsing while the baseline parsed; only then try tree-sitter-validated boundary variants; never keep/drop the author's text on ambiguity — throw `ambiguousBoundaryEchoMessage` instead.

**Invariant:** the applier is a pure splice over `\n`-split lines; it never does I/O; block/cut/paste edits must be resolved before entry (arriving ones are internal-wiring bugs); a mis-set replacement boundary is repaired only when the replacement parses.

**Probe:** `packages/hashline/test/core-contracts.test.ts` (input splitter, cut/blank payload semantics, patcher preflight, recovery), `patcher.test.ts` snapshot tag integrity + tag-based path recovery — run green at `96f428097`.

## Deferred block edits resolve against real syntax
**Path/Symbol:** `block.ts:resolveBlockEdits` with `BlockResolver`.
**Signature:** `resolveBlockEdits(edits, text, path, resolver: BlockResolver)` — `{ path, text, line } → BlockSpan | null`.

### Decisive source
```ts
if (span.start === span.end) {
  // single-line block = line N is a bare statement, not an opener — the common
  // mis-anchor that lands a body in the wrong scope (e.g. between a case body
  // and its break;). Reject and point at it; drop on the lenient preview path.
  throw new Error(`line ${edit.lineNum}: ${blockSingleLineMessage(edit.anchor.line, op, ...)}`);
}
```

**Flow:** resolver returns start/end for the anchor line → non-block edits pass untouched → synthesized inserts/deletes get sequential `index` only for readability (`applyEdits` re-derives every index from array order) → `insert_after_block N:` with a pure closelosing-delimiter line N lowers to plain after-N with a warning; otherwise unresolved → throw `BLOCK_UNRESOLVED` with suggestion scan (next block within 64 lines / enclosing block).

**Invariant:** block ops must be fully concrete before the applier; a failed anchor degrades to a warned plain anchor, never a silent wrong-scope insert.

**Probe:** `packages/hashline/test/block.test.ts` + `patcher.test.ts` cover replacement-boundary and block-anchor edge cases.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(applyEdits|materializeEdits|repairAfterInsertLandings|normalizeTextualBoundaryEchoes|resolveBlockEdits|parsesCleanly)$", limit: 12, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.hashline.src.apply.applyEdits" });
```