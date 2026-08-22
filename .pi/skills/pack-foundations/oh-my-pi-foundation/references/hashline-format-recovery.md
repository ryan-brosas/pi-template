<!-- capsule-v1 -->
# Hashline format + recovery

**Source:** Oh My Pi `main@96f428097`; Codebase Memory project `oh-my-pi` (code-grounded, reactors read). **Path:** `packages/hashline/src/format.ts`, `recovery.ts`.

## Format: a compact, content-anchored patch grammar
**Path/Symbol:** `format.ts:formatReplaceHeader`, `formatCutHeader`, `formatInsertHeader`, `formatHashlineHeader`, `computeFileHash`, `splitAddressableFileLines`.
**Signature:** `formatReplaceHeader(start, end): string`; `formatCutHeader(start, end = start): string`; `formatInsertHeader(cursor): string`; `computeFileHash(text): string`; `splitAddressableFileLines(text): string[]`.
**Data Shape:** a hashline document is a series of `[path#TAG]` file sections; `PUT` owns literal `+`/bare body rows, `CUT N.=M` deletes and optionally captures spans, `REM`/`MV` are file-level headers; `<N`/`>N`/`>$` are gap or tail locators; tags are four uppercase hex characters.

### Decisive source
```ts
const normalized = text.replace(/[ \t\r]+(?=\n|$)/g, ""); // drop trailing eol-space before hashing
const low16 = Bun.hash.xxHash32(normalized, 0) & 0xffff;
return low16.toString(16).padStart(4, "0").toUpperCase();
```

**Flow:** formatters write canonical headers; the parser accepts legacy separators and warns (never crashes) when auto-prefixing bare payload rows; hashing normalizes trailing whitespace so an unchanged logical file keeps its tag; splitting removes one terminal-newline sentinel but preserves a deliberate terminal blank line.

**Invariant:** an empty `PUT` span degenerates to a delete while an empty gap insert is invalid; a clone short tag detects stale content but alone cannot prove a divergent file is safe to replay.

**Probe:** `test/format-v2.test.ts` covers replacement, deletes, gaps, legacy separators, empty bodies, and terminal-newline addressing.

## Recovery: replay only anchor-proved edits
**Path/Symbol:** `recovery.ts:Recovery`, `recovery.recover`, `buildLineMap`, `validateRemappedAnchorContext`, `replayRemappedAnchorsOnCurrent`; `diffLineRuns` native seam.
**Signature:** `new Recovery(store: SnapshotStore)`; `recover(args: RecoveryArgs): RecoveryResult | null`.
**Data Shape:** `RecoveryArgs { path, currentText, fileHash, edits, clipboard? }`; `RecoveryResult { text, firstChangedLine?, warnings? }`. The snapshot store retains one-or-more texts per tag, including colliders.

### Decisive source
```ts
const lineMap = buildLineMap(previousText, currentText);
if (!validateRemappedAnchorContext(previousText, currentText, lineMap, edits)) return null;
return replayRemappedAnchorsOnCurrent(...);
```

**Flow:** recovery finds retained snapshot candidates for the stale tag, diffs previous → current to build a line map, proves each changed/duplicate/moved anchor against its neighbor context, then replays resolved edits on `currentText`. Failed or ambiguous proof returns `null`, leaving the caller to surface current context instead of editing a divergent file.

**Invariant:** independent live edits survive; changed, split, deleted, or ambiguous anchors are never guessed across. The proof window is bounded by the snapshots the store actually retains.

**Probe:** `test/recovery-session-chain.test.ts` proves anchor divergence, remap, duplicate-anchor rejection, and collision selection; `test/format-v2.test.ts` pins grammar.

**Retrieve:**
```ts
await mcp.codebase_search.search_graph({ project: "oh-my-pi", name_pattern: "^(computeFileHash|Recovery|recover|buildLineMap)$", limit: 5, fields: ["signature"] });
```
