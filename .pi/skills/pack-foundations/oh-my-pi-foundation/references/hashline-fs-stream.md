<!-- capsule-v1 -->
# Hashline Filesystem seam — raw text in, transformed text echoed back

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Question:** How do you make a patch engine work over any backing store (disk, memory, LSP doc, VFS) while keeping snapshots and recovery honest?

## The seam: three abstract ops, raw text only
**Path:/Symbol:** `packages/hashline/src/fs.ts:Filesystem` (abstract), `NotFoundError`, `isNotFound`, `InMemoryFilesystem`, `NodeFilesystem`.
**Signature:** `readText(path): Promise<string>`; `writeText(path, content): Promise<{ text }>`; `exists(path): Promise<boolean>`; optional `readBinary`, `preflightWrite`, `delete`, `move`, `canonicalPath`, `allowTagPathRecovery`.
**Data Shape:** raw string lines for read/write; `WriteResult { text }` echoes the actual persisted bytes; `readText` throws `NotFoundError` (`code: "ENOENT"`) on a missing path; string status is the only create-vs-update signal; `preflightWriteOptions` carries `fileOp` for permission hints.

## Decisive source (contract, not code)
```ts
export abstract class Filesystem {
  abstract readText(path: string): Promise<string>;
  async preflightWrite(path: string, options?: PreflightWriteOptions): Promise<void> {}
  abstract writeText(path: string, content: string): Promise<WriteResult>;
  async exists(path: string): Promise<boolean> {
    try { await this.readText(path); return true; }
    catch (error) { if (isNotFound(error)) return false; throw error; }
  }
  canonicalPath(path: string): string { return path; }
  allowTagPathRecovery(authoredPath, resolvedPath): boolean { return true; }
}
```

**Flow:** patcher does all BOM strip + LF normalize between `readText` and `writeText` — the FS deals only in raw strings. `readText` MUST throw `NotFoundError`/anything `isNotFound` accepts when the file is missing; that's how create-vs-update is detected. `writeText` returns the *actual* text persisted, so adapters that transform on serialization (notebooks, pretty-printers) can be cross-checked. `exists` probes with readText and only checks for notfound. `canonicalPath` is the key contract for snapshot caches — override to absolute-ize so producers/consumers agree on the key. `allowTagPathRecovery` is the security gate for tag-based path recovery: hosts granting write by path-shape override to refuse redirects that escalate beyond approved (internal-URL authored targets, out-of-tree resolved paths).

**Invariant:** create-vs-update is decided purely by the notfound contract; a store is honest about what it actually wrote.

**Probe:** `packages/hashline/test/patcher.test.ts` (Patcher mandatory/create-flow flows, tag path recovery), `fs.test.ts` (InMemory + Node), `recovery.test.ts`.

## Streaming numbered read — bounded chunks, no full-file materialization
**Path/Symbol:** `packages/hashline/src/stream.ts:streamsHashLines` (async generator) + `createChunkEmitter` + `StreamOptions`.
**Signature:** `streamHashLines(source: ReadableStream|AsyncIterable<Uint8Array>, options: { startLine?, maxChunkLines?, maxChunkBytes? }): AsyncGenerator<string>`.

### Decisive source
```ts
const wouldOverflow = outLines.length >= options.maxChunkLines || outBytes > options.maxChunkBytes;
if (outLines.length > 0 && wouldOverflow) { const flushed = flush(); if (flushed) chunks.push(flushed); }
outLines.push(formatted);
if (outLines.length >= options.maxChunkLines || outBytes >= options.maxChunkBytes) { flush; }
```

**Flow:** input bytes treated as UTF-8 and split per line; each line LF-stripped and numbered via `formatNumberedLine`; chunks emitted lazily when either line-count (`maxChunkLines ?? 200`) or UTF-8 byte-count (`maxChunkBytes ?? 64*1024`) fires. The generator never assembles the whole file — memory is O(chunk).

**Invariant:** long lines never block the stream; both caps are honored faithfully (whichever fires first).

## Get live surrounding code

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(Filesystem|readText|writeText|canonicalPath|allowTagPathRecovery|streamHashLines|formatNumberedLine)$", limit: 16, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.hashline.src.fs.Filesystem" });
```
