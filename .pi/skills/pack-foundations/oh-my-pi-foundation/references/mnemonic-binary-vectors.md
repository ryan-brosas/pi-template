<!-- capsule-v1 -->
# Mnemonic vector internals — int8/bit store, Hamming+cosine, triples split

**Source:** `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/mnemopi/src/core/binary-vectors.ts`, `vector-math.ts`, `migrations/`.

## Vec type: float32 / int8 / bit, env-driven
**Path/Symbol:** `binary-vectors.ts:getVecType`, `VEC_TYPE`, `quantizeInt8`, `maximallyInformativeBinarization`, `hammingDistance`, `informationTheoreticScore`, `BinaryVectorStore`, `FastBinarySearch`.
**Signature:** `getVecType(env?): VecType` — `MNEMOPI_VEC_TYPE` (float32|int8|bit; default int8; invalid → float32); `quantizeInt8(embedding): Int8Array` — saturate clamp then round; `maximallyInformativeBinarization(embedding): Uint8Array` — bit per dim, byte = `i>>3`, bitmask `7-(i&7)`.
**Data Shape:** rows `{ memory_id, binary_vector: Uint8Array|ArrayBuffer|Buffer, original_dim, magnitude }`; result `{ memory_id, distance, score }`; stats `{ total_vectors, avg_bytes_per_vector, compression_ratio, … }`.

### Decisive source
```ts
const POPCOUNT_TABLE = new Uint8Array(256);  // byte → set-bit count
// hammingDistance: XOR shared bytes, sum via popcount table
// cosineSimilarity (vector-math.ts): missing dims = 0; zero-norm → 0
```

**Flow:** storage inherits the vec type at import; float32 keeps exact cosine; int8 halves footprint via saturating quantization; bit packs `ceil(dim/8)` bytes and searches only by Hamming distance. `BinaryVectorStore` persists BLOB rows in SQLite and inserts + best-matches; `FastBinarySearch` scans row blobs against the popcount table with parity asserted across encodings in `native-vector-parity`.

**Invariant:** encodings are pairwise-lossy only through the given quantizer — cosine exact for float32, approximate for int8, Hamming-only for bit; zero-norm scores 0, never NaN.

**Probe:** `test/binary-vectors.test.ts`, `test/vector-index.test.ts`, `test/native-vector-parity.test.ts`, `test/e5a-vector-voice-dense-rewire.test.ts`, `test/degrade-vector.test.ts`.

## Migrations — triples split behind backup + dry-run
**Path/Symbol:** `migrations/e6-triplestore-split.ts:ANNOTATION_KINDS`, `MigrationOptions { dbPath, dryRun?, backup?, logFn? }`, `copyDatabase`, `hasTable`, `placeholders`.

### Decisive source
```ts
export const ANNOTATION_KINDS = ["mentions", "fact", "occurred_on", "has_source"] as const;
// copyDatabase: serialize() of a read-write handle → backup before split
// rows read in placeholders-chunked batches, reinserted per annotation kind
```

**Flow:** runs only when the legacy `triples` table exists; optionally dry-runs, optionally backs up the whole DB (via SQLite `serialize()`), then migrates rows into per-kind typed tables. Idempotent by construction.

**Probe:** `tests/migrate-triplestore-split.test.ts`.

**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(quantizeInt8|maximallyInformativeBinarization|hammingDistance|FastBinarySearch|cosineSimilarity)$", limit: 10, fields: ["signature"] });
```