<!-- capsule-v1 -->
# Hashline parser seams — lexical sections, lenient ranges, strict anchors

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Question:** How do you split a model-authored patch into sections and anchors without trusting the model?

## Lexical section splitter — structure first, existence later
**Path/Symbol:** `packages/hashline/src/input.ts:splitHashlineInput` (+ `Tokenizer`, `Patch` lazy edits); `packages/hashline/src/tokenizer.ts:parseLid`, `scanRangeSeparator`, `splitHashlineLines`.
**Signature:** `splitHashlineInput(text, opts): PatchSection[]`; `parseLid(raw, lineNum): Anchor`; `parsePatch(diff): ParsedPatch` / `parsePatchStreaming(diff)` (both in `parser.ts`).
**Data Shape:** sections rooted at `[PATH#HASH]` headers; each carries `path`, `hash?`, edits; edits are line-anchored anchors `{ line: number }` plus hunks; ranges tolerate many separators.

### Decisive source
```ts
// The splitter is purely lexical — it doesn't know whether a section's path
// actually exists. That's the patcher's job.
function stripNeededPatienceNoise(pathText) {
  /* strip `Update File:`, `Update:`, `Add File:`, `Move to:`, `***` … */
}
function tryParseRecoveryHeader(line, cwd?) {
  /* best-effort bracketed-header recovery when the strict tokenizer rejects */
}
```

**Flow:** the top-level splitter walks lines, recognizing `[PATH#HASH]` headers, unquoting `"path"`/`'path'`, then stripping apply_patch-style verb noise (`Update File:`, `Add File:`, `Move to:`, duplicated `***`) that models reflexively prepend. Each section keeps its raw edits until `Patch` lazily parses them per section — the splitter never validates paths exist.

## Lenient ranges, strict line anchors
**Path/Symbol:** `tokenizer.ts:scanRangeSeparator`, `scanEcNumber`, `parseLid`.

### Decisive source
```ts
const number = scanLineNumber(raw, numberStart, end);
if (number === null || skipWhitespace(raw, number.nextIndex, end) !== end) {
  throw new Error(
    `line ${lineNum}: expected a line number such as ${describeAnchorExamples("119")}; got ${JSON.stringify(raw)}. Use ${HL_FILE_PREFIX}PATH${HL_FILE_HASH_SEP}hash${HL_FILE_SUFFIX} …`,
  );
}
return { line: number.line };
```

Ranges are parsed deliberately lenient: canonical `.=` but `-`, `=`, `.`, `..`, `…`, mixed runs, and whitespace-only separators all recover to the same range. Line anchors are the opposite: `parseLid` demands bare unsigned decimal that scans to end of token (integer overflow is rejected via `SafeInteger` guard), and the thrown error names the accepted shape (the `describeAnchorExamples` hint) plus the fix (re-read the file for the current hash).

**Invariant:** ranges forgiving, anchors strict — a bare number is only ever a line; separators never reshape edits.

## Snapshot store — read-through cache keyed by canonical path
**Path/Symbol:** `packages/hashline/src/snapshots.ts:SnapshotStore` (abstract), `InMemorySnapshotStore`.
**Signature:** `SnapshotStore.read(path): Promise<Snapshot>` where snapshot carries the canonicalPath + lastWrite.

**Decisive shape:** the store is a read-through cache of `{ path …}` keyed by `canonicalPath`, so producers and consumers agree even when the authored path differs (viewer-relative vs absolute). Used for `diff`/`show` effort while recovery go reconstructs the authoritative text; never treated as a patching source of truth — stale/missing snapshots degrade to live reads.

**Invariant:** Snapshots are advisory, never authorative. Patches are applied against live content, snapshots only speed up preview/recovery.

**Probe:** `test/leniency.test.ts` (range/header leniency), `test/format-v2.test.ts` (anchor phrasing), `test/snapshots.test.ts` (cache staleness and canonical key), `test/core-contracts.test.ts` (strict parse errors).

## Retrieve live code
```ts
await \`mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(parsePatch|parsePatchStreaming|parseLid|splitHashlineLines|scanRangeSeparator|SnapshotStore)$", limit: 10, fields: ["signature"] })\`;
await \`mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.hashline.src.input.splitHashlineInput" })\`;
```
