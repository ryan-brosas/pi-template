<!-- capsule-v1 -->
# Hashline clipboard registers + syntax proof

**Source:** Oh My Pi `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/hashline/src/clipboard.ts`, `syntax.ts`.

## Clipboard resolution: capture before delete, expand before apply
**Path/Symbol:** `clipboard.ts:hasClipboardEdit`, `resolveClipboardEdits`, `startClipboardBatch`, `commitClipboard`, `validateClipboardSequence`.
**Signature:** `resolveClipboardEdits(edits, fileLines, clipboard, options): readonly Edit[]`; `ResolveClipboardEditsOptions { onEmptyPaste?: "throw" | "drop"; onWarning? }`.
**Data Shape:** `Clipboard` carries batch-local anonymous `lines` and `pendingAnonCuts`, plus optional `named: Map<string, string[]>`; cuts carry a source range and optional register, while pastes target a `gap` or `span`.

### Decisive source
```ts
if (edit.kind === "cut") {
  writeRegister(edit, fileLines, clipboard);
  continue;
}
// a gap expands to synthetic inserts; a span emits inserts followed by
// per-line deletes for the selected range
```

**Flow:** edits are resolved in authored order against the original `fileLines`. A cut snapshots its range and emits nothing; a gap paste becomes inserts, while a span paste inserts replacement lines then deletes the span. `startClipboardBatch` copies only named registers into a new batch, and `commitClipboard` publishes only named-register changes back to a host-owned clipboard.

**Invariant:** an absent named register warns and no-ops for a gap but throws for a span (unless preview `drop` skips the paste); an absent or ambiguous anonymous register throws by default. No empty paste may silently delete a span.

**Probe:** `test/clipboard.test.ts` covers cut/paste round trips, span replacement, empty-register behavior, and anonymous-paste ambiguity.

## Tree-sitter syntax proof: absence of proof is not a veto
**Path/Symbol:** `syntax.ts:nodeChain`, `enclosingBoundaries`, `parsesCleanly`; native `enclosingBlockBoundaries` and `nodeChainAt`.
**Signature:** `nodeChain(lines, path, line): readonly NodeSpan[]`; `enclosingBoundaries(lines, path, startLine, endLine): readonly number[]`; `parsesCleanly(path, text): boolean`.
**Data Shape:** cache keys combine content hash, length, path, and queried line/range; parse, boundary, and chain caches are FIFO-bounded to `PARSE_CACHE_MAX = 256`.

### Decisive source
```ts
chain = nodeChainAt({ code: text, path, line }) ?? [];
boundaries = enclosingBlockBoundaries({ code: text, path, ranges }) ?? [];
// an unrecognized language, parse failure, or native failure returns []/false
```

**Flow:** boundary repair can consult an innermost-first named-node chain and enclosing structural boundaries when text evidence is insufficient. `parsesCleanly` deliberately conflates an unknown language with a parse failure, so callers can withhold a structural rewrite rather than invent a semantic conclusion.

**Invariant:** `[]` or `false` means no structural evidence, never evidence that the source or proposed edit is wrong; only positive, path-aware parser results may support a structural repair.

**Probe:** `test/boundary-repair.test.ts` exercises parser-driven boundary decisions; `test/clipboard.test.ts` covers the edit expansion that feeds the applier.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(hasClipboardEdit|resolveClipboardEdits|nodeChain|enclosingBoundaries|parsesCleanly)$", limit: 8, fields: ["signature"] });
```
