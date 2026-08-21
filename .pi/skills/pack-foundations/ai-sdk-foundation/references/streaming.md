# Vercel AI SDK — Streaming Reference

Complete source-grounded reference for the streaming layer. Files: `packages/ai/src/generate-text/stream-text.ts` (2,864 lines, head+structure read), `packages/ai/src/generate-text/smooth-stream.ts` (163 lines, read in full), `packages/ai/src/generate-text/stop-condition.ts` (read in full), and `packages/ai/src/generate-text/stream-language-model-call.ts`.

## Stop conditions replace max-steps

The tool-calling loop's termination is a PREDICATE ARRAY, not a counter (`stop-condition.ts`, full):

> "A tool calling loop continues until one of the following conditions is met: The model returns a finish reason other than `tool-calls`; A tool without an execute function is called; A tool call needs approval; One of the provided stop conditions returns true."

Built-ins compose: `isStepCount(n)`, `isLoopFinished()` (never true — natural termination only), `hasToolCall(...names)` (autocomplete-friendly `keyof TOOLS | string & {}`). Evaluation is `Promise.all(...).some()` — any condition stops. Default is `isStepCount(1)` (:376).

**Lesson:** model loop termination as composable predicates over accumulated step results — max-steps becomes just one predicate among many.

**Probe:** hasToolCall('deploy') fires when the last step called deploy even if other tools also ran.

## prepareStep: per-step mutation of everything

`prepareStep` (:527, invoked :1931+) can override model, tools, active-tool subsets, sandbox, and runtime context BEFORE each step — including mutating runtime context mid-run (:473: "If you need to mutate runtime context, update it in prepareStep"). Combined with `stopWhen` arrays this enables agent policies like "narrow the toolset each step" or "swap to a cheaper model after step 2."

## smoothStream: chunk-detection streaming for UI comfort

`smoothStream` (163 lines, full) smooths bursty provider chunks into word-by-word (default regex `/\S+\s+/m`), line-by-line, custom-RegExp, Intl.Segmenter (recommended for CJK — duck-typed via 'segment' in chunking), or custom ChunkDetector output. Mechanics:

- Buffers text-deltas per (type,id); flushes on type/id change AND on non-smoothable chunks (tool calls pass through immediately after flushing).
- Custom detectors must return a PREFIX of the buffer or throw — "Chunking function must return a match that is a prefix of the buffer."
- providerMetadata (e.g. Anthropic thinking signatures) is preserved across buffered flushes.
- Each detected chunk enqueues then awaits delayInMs (default 10ms; null disables).

**Lesson:** smooth streaming = buffer + chunk-detector + fixed-delay drain, with type/id changes as flush boundaries and metadata carried through buffers.

## Verification

The chunking contract is pinned by `smooth-stream.test.ts` (2,101 lines): custom detectors must return buffer prefixes or throw; word/line defaults match the `CHUNKING_REGEXPS` word/line pair. Stop conditions compose by construction — `isStepCount(1)` is the default in `stream-text.ts` and evaluation is `Promise.all(...).some()` in `stop-condition.ts`. Four-layer timeouts (first-chunk / per-chunk / per-step / total) live in `packages/ai/src/prompt/request-options.ts` and merge via `packages/ai/src/util/merge-abort-signals.ts`; multi-step runs stitch per-step results (`packages/ai/src/util/create-stitchable-stream.ts`) into one continuous observable.

## Timeouts layered four ways

Request options expose getFirstChunkTimeoutMs, getChunkTimeoutMs (per-chunk stall), getStepTimeoutMs, and getTotalTimeoutMs — plus mergeAbortSignals combining caller signals with timeout controllers. First-chunk timeout catches dead providers fast; chunk timeout catches mid-stream stalls; total bounds everything.

## Stitchable streams

createStitchableStream lets multi-step runs append each step's stream into one continuous observable — steps stitch rather than concatenate, so consumers see one unbroken event flow with per-step results available separately (StepResult array on finish).
