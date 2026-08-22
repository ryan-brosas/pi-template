<!-- capsule-v2 -->
# Atomic write — temp-file + rename, with Windows contention retry

**Source:** pi-fabric (monotykamary) MIT `<branch>@<commit>`; Codebase Memory `pi-fabric`. **Question:** how does a file/JSON write survive partial failure and Windows rename contention without corrupting the target?

## Connected graph-selected seam
**Path/Symbol:** `src/core/atomic-write.ts` (98 lines): `renameAtomic` (:39-58), `writeFileAtomic` (:60-80), `writeJsonAtomic` (:89-98); `AtomicWriteOptions` (:5-16), `RETRYABLE_RENAME_CODES` (:18).
**Signature:** `writeFileAtomic(filePath, contents, options?)` — mkdir -p parent (mode 0o700), write to a temp file (`${filePath}.${pid}.${uuid}.tmp`, mode 0o600), then `renameAtomic` to the target; `writeJsonAtomic` adds optional pretty-print + trailing newline.
**Data Shape:** `AtomicWriteOptions {mode?, dirMode?, renameRetries? (default 8), renameRetryDelayMs? (default 25)}`; retryable rename codes `EPERM/EACCES/EEXIST/EBUSY`.

### Decisive source
```ts
export const renameAtomic = (source, target, options?) => {
  const attempts = Math.max(1, options?.renameRetries ?? 8)
  const delay = options?.renameRetryDelayMs ?? 25
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { fs.renameSync(source, target); return }
    catch (error) {
      const code = errorCode(error)
      if (attempt === attempts || code === undefined || !RETRYABLE_RENAME_CODES.has(code)) throw error
      syncSleep(delay * attempt)  // Atomics.wait-based portable sleep
    }
  }
}
export const writeFileAtomic = (filePath, contents, options?) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: options?.dirMode ?? 0o700 })
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try { fs.writeFileSync(temporary, contents, { encoding: "utf8", mode: options?.mode ?? 0o600 }); renameAtomic(temporary, filePath, options) }
  finally { fs.rmSync(temporary, { force: true }) }
}
```

**Flow:** write to a temp file (same dir, so rename is atomic on POSIX) → rename over the target → on failure, remove the temp. Windows rename contention (antivirus/indexer probing) retries up to 8 times with linear backoff before surfacing.
**Invariant:** the target is never partially written (temp + atomic rename); a failed write removes the temp (no litter); JSON writes support pretty-print + trailing newline.
**Probe:** `tests/` atomic-write coverage (temp removed on failure; rename retries on EPERM/EBUSY; JSON pretty-print/newline options; parent dirs created).

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "pi-fabric", query: "writeFileAtomic renameAtomic writeJsonAtomic temp rename retry", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the temp-file + atomic-rename write with bounded Windows-contention retry and temp cleanup; adapt the retry count/delay and file modes to host.
