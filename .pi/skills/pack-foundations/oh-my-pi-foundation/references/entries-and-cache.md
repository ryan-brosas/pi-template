# Entries and message-cache: the durable store of a session

> Provenance. Source repo `/mnt/hdd/utopia/inspo/oh-my-pi` (MIT), head `45e12e5bb758198a920c6070e7e64cb33b21beac`. Files read in full this pass: `packages/agent/src/compaction/entries.ts` (141 lines), `compaction/message-cache.ts` (92), `compaction/messages.ts` (241), `compaction/utils.ts` (343), plus `tokenizer.ts` and `thinking.ts`. This is the fourth reference tile of the oh-my-pi-foundation skill, sitting between the producer (agent-loop.md) and the reducers (compaction-suite.md, prune-and-shake.md) as the storage plus estimator-cache substrate. Study method: full reads of the linked files, plus export scans to verify every type and function anchor.

---

## 1. Why a SessionEntry union exists

agent-loop.ts reasons about messages (AgentMessage[]); the durable session store reasons about a richer record. The gap is bridged by an adapter (in the session manager) that moves between the two. entries.ts defines that durable record as a closed union SessionEntry (entries.ts tail):

- SessionMessageEntry - a message entry ({ type: message, message: AgentMessage }).
- ThinkingLevelChangeEntry - a thinking_level_change marker.
- ModelChangeEntry - model_change with model and role.
- ServiceTierChangeEntry - service_tier_change.
- CompactionEntry - compaction with summary, shortSummary, firstKeptEntryId, tokensBefore, details, preserveData, fromExtension, warning.
- BranchSummaryEntry - branch_summary with fromId, summary, details.
- CustomEntry, CustomMessageEntry, LabelEntry, TitleChangeEntry, TtsrInjectionEntry, SessionInitEntry, ModeChangeEntry, and the extension seam CustomCompactionSessionEntries.

The union is closed over a known set plus one generic extension slot, so extensions can add durable kinds without widening the base union every release. ReadonlySessionManager exposes getBranch(leafId?) and getEntry(id) so readers never write.

## 2. The SessionEntryBase spine

Every entry shares SessionEntryBase (entries.ts:9): type, id, parentId, timestamp. That is the whole spine: nothing is mandatory for every kind. The closed-but-extensible design means a thinker can attach any specifics, but the base API (id, parent, timestamp) is universal and testable.

## 3. Why the record is separate from the message

The loop is the semantic engine; the store is the durable, append-only, addressable history. Keeping them separate lets: (a) the loop read and write permutations without touching the durable spine; (b) the store add compaction and branch markers without changing AgentMessage shape; and (c) the reducers navigate durable markers (prunedAt, compaction boundary) without polluting the semantic message type. This is the AgentMessage vs SessionEntry split already flagged in agent-loop.md study 23; this file is the full housing.

## 4. The CompactionEntry shape - the load-bearing marker

CompactionEntry (entries.ts:47) is the note a compaction pass leaves in the store: summary (long), shortSummary (card), firstKeptEntryId (the boundary), tokensBefore (for provenance), preserveData (extension data to persist across compaction), fromExtension, and warning (a dead-end notice the progress guard attaches when a pass freed too little to continue maintenance). Every consumer locates the last compaction by scanning for this entry type; everything before firstKeptEntryId is collapsed.

## 5. BranchSummaryEntry

BranchSummaryEntry (entries.ts:80) folds a branch: fromId points at the start of the folded region; summary is the condensation; details is extension-specific (never sent to llm). It is the durable record behind branch-summarization.ts (prune-and-shake.md study 23). The fromId is the anchor that lets a viewer know what region the summary replaced.

## 6. CustomMessage and HookMessage

messages.ts defines CustomMessage (role custom) and the legacy HookMessage (role hookMessage), both with customType, content, display, details, attribution, timestamp. These are session-migrated message forms that let extensions inject arbitrary rendered content into the history for display while keeping the LLM-visible fabric separate. They are part of the durable entry space via CustomMessageEntry and the label/custom kinds.

## 7. The SessionEntry union list (verified)

As read from entries.ts, in no particular order, the union members are: SessionMessageEntry, ThinkingLevelChangeEntry, ModelChangeEntry, ServiceTierChangeEntry, CompactionEntry, BranchSummaryEntry, CustomEntry, CustomMessageEntry, LabelEntry, TitleChangeEntry, TtsrInjectionEntry, SessionInitEntry, ModeChangeEntry, and the CustomCompactionSessionEntries seam. The set is small enough that an exhaustiveness check (a never-return switch) in the adapter catches missed kinds at compile time.

## 8. ReadonlySessionManager

The manager interface only exposes reads: getBranch(leafId?) and getEntry(id). Writes go through the concrete manager; read surfaces (the loop, the reducers, the viewer) depend on the readonly seam. This is the same immutability-for-readers ethos as the loop's snapshot boundary.

---

## Part B: the message-cache and the settle-gate

---

## 9. Why a cache at all

Long sessions walk the same settled AgentMessage[] every turn, re-tokenizing and re-converting historical objects that only the newest suffix can change. message-cache.ts (92) memoizes the two hot walks: token estimation (estimateTokens) and the coding-agent's convertToLlm. Both cache by message identity, so a settled message is counted and converted once and reused until the owning reducer rewrites it.

## 10. The settle-gate invariant

A streaming assistant is mutated under one identity while usage and stopReason are provisional (the seed carries zeroed usage and a placeholder stopReason). Caching it would freeze a mid-stream count. So estimation only caches assistants that are settled - real usage (totalTokens > 0) with a terminal stopReason that is not "aborted" or "error". Unsettled assistants never read or insert. Non-assistant roles are immutable once appended and cache by identity freely. This settle-gate is the whole correctness premise: without it, a mid-stream count could be frozen and later reused.

## 11. The dual-split caches

Because the compaction HOST floor passes excludeEncryptedReasoning (dropping opaque provider reasoning), a message has two distinct estimates: the floored one and the default one. The cache keeps TWO WeakMaps (estimateCacheDefault, estimateCacheFloored) so the two computations never collide. readEstimateCache and writeEstimateCache take the option flag and select the right map.

## 12. Why WeakMap, not symbol-keyed properties

Callers spread messages to derive throwaway variants for counting (estimateBranchSummaryTokens does estimateTokens({ ...message, content: truncated })). A symbol-keyed cache value would ride along an object spread, so the clone would inherit and return the full-content estimate. Keying on identity (WeakMap) keeps the cache OFF spread copies - a spread clone is a fresh object with a fresh count. This is a subtle, deliberate design: the cache must not leak onto derived messages.

## 13. External invalidators

registerMessageCacheInvalidator (message-cache.ts) is the seam for caches living outside this package (the coding-agent convertToLlm memo). It registers a Set of invalidators; invalidateMessageCache calls each. This is how the durable store tells a cross-package memo a mutation happened. The registration returns an unregister so a teardown can detach.

## 14. invalidateMessageCache is the correctness seam

invalidateMessageCache (message-cache.ts) deletes both keys and calls every external invalidator. Every in-place mutator must call it: pruneToolOutputs, pruneSupersededToolResults, applyShakeRegion, stripImagesFromMessage (the four owner mutations). Without invalidation, the next convert/estimate pass freezes stale content. This cache-invalidation-on-write is the correctness seam of the whole estimator story (prune-and-shake.md exposes the same contract).

## 15. The dual-option estimate fan-out

The compaction createSummary path in the estimator chooses which cache map; readEstimateCache/writeEstimateCache are the fixed seam. A future reducer that needs a third split (e.g. a per-provider dialect estimate) only adds a map and a case, not a new cache system.

---

## Part C: messages.ts - the LLM-facing fabric

---

## 16. The summarize templates

messages.ts imports compactionSummaryContextPrompt and branchSummaryContextPrompt (markdown, via a text import) and builds COMPACTION_SUMMARY_TEMPLATE and BRANCH_SUMMARY_TEMPLATE. These are the prompt bodies the summarizer functions (in compaction.ts) inject around the model-specific rendering. The templates are upgraded verbs - the context the model is told to produce.

## 17. CustomMessage 2 fields

Pipeline: CustomMessage carries role: custom, customType, content (string or content blocks), display, details, attribution, timestamp. The attribution (MessageAttribution) matters for billing and display semantics: it records who initiated this message (harness vs model vs user). This is used by the billing and cost telemetry to attribute tokens correctly.

## 18. HookMessage legacy

HookMessage is the pre-extension legacy shape (same body). It is kept for session migration: older saved sessions may carry hookMessage entries that must still round-trip. Keeping compat types is a deliberate cost so upgrades never strand user sessions.

## 19. BranchSummaryMessage vs CompactionSummaryMessage

The two summarize message shapes distinguish a branch summary (from a user-facing branch scratchpad) from a compaction summary (the whole-session fold). They share the content block shape but differ in semantics and in the durable marker each leaves. A reader of the store can tell which type produced a given message from its role/type.

---

## Part D: utils.ts and the shared helpers

---

## 20. FileOperations

utils.ts defines FileOperations (read, written, edited) and createFileOps(). extractFileOperations (in compaction.ts study) pulls these from a session so a summary notes which files were touched. The three are Sets of paths; the summary template renders grouped paths (formatGroupedPaths) so the compaction output is stable and readable.

## 21. Dialect and Harmony helpers

utils.ts imports Dialect from pi-ai/dialect and escapeHarmonyControlTokens from ui/harmony-leak. The dialect abstraction lets tool-call serialization vary per provider (owned-dialect in agent-loop.ts study); HarmonyWeb escaping counters the model-family leak: any control token the model accidentally emits is escaped so it cannot prematurely end a frame. These utilities are the shared glue the reducers call, and they construe the render sugar (stringifyJson, prompt) used by summarization.

## 22. The summarization system prompt

utils.ts imports summarization-system.md via text import. This is the system prompt for summarization; formatAdditionalContext and the summarize prompt composition in compaction.ts use it. Not studied line-by-line here (listed as deferred), but its role - the stable instructed surface for the summarizer - is pinned.

## 23. utils as the single helpers surface


## 23. utils as the single helpers surface (clean re-write)

The utils module is deliberately shared across compaction and branch-summarization. Its docstring: Shared utilities for compaction and branch summarization. Centralizing file-ops, dialect, harmony, and prompt wrapper keeps the two reducers consistent: the same grouping, the same escaping, the same summary shape. That single-surface choice is what makes compaction and branch-summarization speak the same dialect of summary. No duplication means no drift between the two reducer families.

## 24. How this tile sits with its siblings

Read this with the reducer references (compaction-suite, prune-and-shake): they consume entries (boundaries, notices, compaction markers) and mutate message content while calling invalidateMessageCache. Read with agent-loop: the loop consumes the semantic AgentMessage; this file's entries are the storage underneath. The estimator (tokenizer.ts) caches here; thinking (thinking.ts) drives the level that compaction effort later resolves. This tile is the storage and cache spine of the whole skill.

---

## Part E: the tokenizer and thinking selectors

---

## 25. tokenizer.ts in full

tokenizer.ts is short (34 lines) and two-mode. countTokens(text|text[]) chooses: if PI_TOKENIZER_ACCURATE is set to 1 and NODE_ENV is not test, it calls the native countTokensNat from pi-natives (exact). Otherwise it uses estimateTokens: for a string, (Buffer.byteLength(text, utf8) + 3) >> 2; for an array, reduce sums of that per-string. This is a byte-length over four estimate - cheap, deterministic, no deps, and deliberately approximate. countTokensConservatively uses raw byte length (no divide) so it never under-estimates. The whole file: two exports, one env switch.

The critical behavioral facts: (a) exactness is opt-in via env, (b) the default is a byte/4 heuristic with +3 rounding so small strings round to at least 1, (c) conservative mode uses byte length loose so it never under-counts, (d) tests run in NODE_ENV test so they always use the fast heuristic (deterministic across CI). compress always wins on speed; PI_TOKENIZER_ACCURATE exists for operators who need true counts.

## 26. Why a byte-count estimate is acceptable

The harness needs a stable, fast, dependency-free token count for thresholds and cut decisions (compaction-suite.md). A byte/4 estimate is within ~30% for typical English/code on most tokenizers and is deterministic and cacheable. countTokensConservatively is the safety variant for the compaction HOST floor (never under-count) while the plain count is used where an underestimate just means a slightly later trigger. The tension is resolved by exposing both and letting call sites choose the conservative one for floors.

## 27. thinking.ts in full

thinking.ts (17 lines) exports the ThinkingLevel const object mapping Inherit/Off to strings and Minimal/Low/Medium/High/XHigh/Max to the Effort enum values from pi-ai. ResolvedThinkingLevel excludes inherit. This is where compaction and the loop read the user's reasoning dial: resolveCompactionEffort (compaction-suite.md) maps a level to an Effort, and the loop threads it through provider calls. Inherit defers to a higher-level selector; Off disables reasoning. Minimal in the middle; the enum order gives a total ordering for effort math.

## 28. The dial-to-effort pipeline (cross-ref)

The flow: user sets a ThinkingLevel (thinking.ts); the loop reads it into config thinkingLevel; for compaction, effortFromThinkingLevel (compaction.ts:715) maps and resolveCompactionEffort (750) clamps per model - for example grok-build High maps to undefined. So the same dial yields different actual effort by model capability. This is the model-aware threading principle; the selector is the input side, the clamp is the model side.

## 29. Why these are separate from the estimator

thinking.ts is pure selection, not counting. tokenizer.ts is counting, not selection. Keeping them separate avoids conflating what the user wants (a level) with how big the content is (a count). The loop reads ThinkingLevel to decide effort; the estimator reads text to size cuts. Two different axes, two small modules.

---

## Part F: the durability contract in one page

---

## 30. The seam list

- SessionEntryBase: the spine (type, id, parentId, timestamp).
- SessionMessageEntry: a message entry.
- CompactionEntry: boundary (summary, shortSummary, firstKeptEntryId, tokensBefore, preserveData, warning).
- BranchSummaryEntry: branch fold (fromId, summary, details).
- entries variants: thinking_level_change, model_change, service_tier_change, custom, label, title_change, ttsr_injection, session_init, mode_change.
- ReadonlySessionManager: read-only stance.
- message-cache: settle-gated, dual-map, external-invalidated estimator cache.

## 31. The invariants this reference pins

1. Identity is the cache key; spread clones never inherit a cache hit (WeakMap).
2. Unsettled assistants are never cached or inserted.
3. Every in-place reducer mutation invalidates the cache.
4. The compaction floor uses the conservative estimate; the decision estimate is the byte/4.
5. The SessionEntry union is closed + one extension seam.
6. Read surfaces depend on the readonly interface.

## 32. Where the reader goes next

The storage/cache spine is done; the next tile (tokenizer-and-thinking.md) will be a focused pair; then tool-protection, then the wrapper and ui. Each continues the read-first, anchor-cited discipline.


---

## Part G: utils.ts - the shared machinery floor

---

## 25bis. The full export surface of utils.ts (verified)

- createFileOps (23): returns empty FileOperations {read, written, edited} Sets.
- splitReadSelector (48): splits a read-tool path into base path and trailing selector.
- stripReadSelector (76): returns just the base path (drops any selector).
- isUrlSchemePath (93): true for scheme:// URLs.
- extractFileOpsFromMessage (100): pulls read/write/edit ops from an assistant tool-call.
- computeFileLists (137): FileObjects -> readFiles + modifiedFiles arrays.
- formatFileOperations (165): renders the file lists for a summary.
- upsertFileOperations (182): merge new ops into a FileOperations.
- truncateToolResultForSummary (205): shorten a tool result for a summarize context.
- serializeConversationForSummary (214) / serializeConversation (224): render a Message[] into text.
- SUMMARIZATION_SYSTEM_PROMPT (343): the pre-rendered summary system prompt.

These are 12 exported surfaces. Each is small, and each is a single-responsibility helper the reducers and the summarize pipeline call.

## 27. The read-selector grammar (mirror discipline)

The selector grammar in utils.ts is described as mirrored from the conservative filesystem splitter in packages/coding-agent/src/tools/path-utils.ts (splitPathAndSel), and the comment explicitly says: keep in sync. The grammar: a trailing :chunk is a selector only when it is a line-range list (50, 50-200, 50+10, 5-16,960-973, .. alias), raw, or conflicts - alone or as a compound range:raw / raw:range. The three regexes (READ_SELECTOR_RE, READ_RANGE_ONLY_RE, READ_RAW_ONLY_RE) define the shape.

Why this matters: the same `:50-200` range should not make one file read look like a different file. splitting read paths consistently (shared grammar with the read tool) means the read/write/edit <files> summary behaves identically to the actual read-tool interpretation. That sync is a cross-package invariant: utils.ts in packages/agent and path-utils.ts in packages/coding-agent must agree or the file markers lie.

## 28bis. Compound selectors

splitReadSelector (48-75) also handles the compound trailing form `path:1-50:raw` and `path:raw:1-50`: it notes the inner candidate, checks raw/range, and if the combination is raw+range (in either order) rebuilds the selector as inner:outer and trims the base once. This two-level parsing is exactly the compound-selector support collisions in the read tool - a file with a range and a raw view dedupe to the same base path.

## 29bis. URL schemes are NOT files

isUrlSchemePath (93) covers conflict://, artifact://, local://ctx.md, history://, issue://, https:// and the fragile file.ts:conflict://1 prefix form. Such a path references a session-scoped or remote resource, not a file the post-compaction agent can re-ground on. extractFileOpsFromMessage (100) skips paths that match it before classifying as read/write/edit, so the <files> summary never claims to have touched a URL that is really a remote resource.

## 30bis. extractFileOpsFromMessage - the per-assistant pass

extractFileOpsFromMessage (100) walks an assistant message's toolCall blocks, reads the path argument, and dispatches on block.name (read / write / edit) to the matching FileOperations set, skipping non-path tool calls and URL-schemed paths. This is the single extraction that feeds the compaction summary's file lists (extractFileOperations in the compaction driver). It keeps the file provenance of a session without re-deriving later.

## 31bis. computeFileLists and format

computeFileLists (137) turns the Sets into sorted arrays readFiles and modifiedFiles; formatFileOperations (165) renders them into the summary's <files> section (grouped via formatGroupedPaths). The stable ordering and grouping is what makes the compaction summary text deterministic and diffable across runs.

## 32bis. upsertFileOperations

upsertFileOperations (182) merges a batch into an existing FileOperations (idempotent Set-union). It is how multiple appends over a session accumulate the full file-ops list without duplicating paths.

## 33bis. Truncation and serialization

truncateToolResultForSummary (205) bounds a long tool result for the summary so a giant output doesnot inflate the condensation; serializeConversationForSummary (214) and serializeConversation (224) render Message[] into the adapter text the summarizer consumes, honoring the dialect (owned/escape) so the serialized form is provider-correct. These are the exact bytes the summarizer sees.

---

## Part H: the whole storage+cache contract

---

## 34. Pulling it together: entries, messages, cache, utils

- entries.ts owns the durable closed union and the readonly seam.
- messages.ts owns the LLM-facing message shapes and summarize templates.
- utils.ts owns the shared helpers (file ops, selectors, serialization, prompts).
- message-cache.ts owns the settle-gated estimator memo.
- tokenizer.ts, thinking.ts are the two small butters.

The stack is: message semantic type + durable entries + estimator cache + reducer mutations + reader seams. Each owns one responsibility; the contracts are the bo-old; the seam is identity-invalidation.

## 35. The cross-package sync invariant

The selector grammar sync between packages/agent/compaction/utils and packages/coding-agent/tools/path-utils is the single most fragile cross-package invariant in this area. Keep them in sync or the file-ops summary will silently disagree with the rewrite tool's idea of paths. The comment says it out loud: keep in sync.

## 36. Where ref 4 ends

This reference plus Parts E/F (tokenizer + thinking) covers everything storage/cache/estimate/file. Next tiles add the rest of the skill toward the 10-reference floor.


---

## Part I: the migrate and round-trip concern

---

## 37. Why legacy shapes survive

HookMessage and the various pre-extension entry kinds are kept deliberately. A session saved under an older version must round-trip under the new one; dropping relationship shapes would quietly corrupt or drop user data on upgrade. The maintainability trade is explicit and costs some clutter, but it buys a guarantee that the durable store is backward-compatible. This is a recurring oh-my-pi posture: never strand a user's saved state for an internal refactor.

## 38. The migration funnel

The bridge lives in the session manager: persisted JSON -> SessionEntry[] (via entry adapters that tolerate legacy kinds) -> AgentMessage[] (via messages.ts normalizers). Each migration step is a small pure function; a failure at any one preserves the raw entry rather than silently dropping it. Migrations are additive and idempotent so a re-read never double-transforms.

## 39. attribute and billing provenance

MessageAttribution (on CustomMessage / HookMessage) records who initiated the message: user, model, harness, or extension. The billing and cost telemetry read it; the display layer reads it; the durable entry keeps it round-tripping. Attribution is first-class because tokens cost money and you must know whose they were.

---

## Part J: reader-oriented invariants, restated

---

## 40. The reader never mutates

ReadonlySessionManager (getBranch/getEntry only) is the contract that read surfaces depend on. The loop, the reducers, and the viewer all read through it; writes flow only through the concrete manager. Anything that needs to write takes the concrete type, so mutation call-sites are contagious and the readonly boundary stays honest.

## 41. The store is append-mostly

New entries are appended (id, parentId chain). Mutations (prune, shake, compaction) do NOT reorder history: they replace in place (notices, summaries) while preserving the parent chain. The consequence is the same as the loop's immutability: an abort, a prune, a compaction each leave a consistent, replayable prefix. This is what makes the store a durable log rather than a mutable buffer.

## 42. Compaction boundary as a store primitive

The firstKeptEntryId in CompactionEntry is not just metadata - it is the load-bearing boundary of the whole memory policy (see compaction-suite.md). Every reducer and reader uses it to know what is collapsed vs live. It is a first-class field of the durable entry, not a coincidental integer.

---

## Part K: closing the storage tile

---

## 43. The 100-shot

- durable spine: SessionEntry (closed union + extension seam).
- per-kind: message, thinking_level_change, model_change, service_tier_change, compaction, branch, custom, label, title, ttsr, init, mode.
- reader: ReadonlySessionManager.
- cache: settle-gated, dual-split (floored vs default), external-invalidated.
- helpers: file ops, read selectors, url scheme, serialize, prompt.
- tokenizer: byte-count heuristic (env-exact opt-in).
- thinking: level enum + inherit/off.

## 44. The porting card

1. Keep a closed durable union with a single extension seam.
2. Give readers a read-only interface; make writes flow through one manager.
3. Key caches by identity (WeakMap), settle-gate assistants, invalidate on every mutation.
4. Keep two cache splits for the XOR estimate option (floored vs default).
5. Treat the compaction boundary as a first-class durable field.
6. Preserve legacy shapes; migrate additively.
7. Guard every cross-package grammar with a keep-in-sync comment.
8. Use byte-count estimate for speed; conservative variant for floors.

## 45. Next tile

This is the storage/cache spine. The next reference (tokenizer-and-thinking) is a focused pair; then tool-protection; then the wrapper; then the ui; then remote-detail; then prompts. Each meets the same floor.


---

## Part L: the full entry pantheon (exact shapes)

---

## 46. ThinkingLevelChangeEntry

ThinkingLevelChangeEntry (entries.ts, type thinking_level_change) is a bare marker: it records that the session's reasoning level changed, optionally carrying a thinkingLevel string or null. It has no message body - the change is a session event, not a conversational turn. A viewer renders it as a small UI notice; the store keeps it so a re-read of history shows when the dial moved and to what.

## 47. ModelChangeEntry

The model_change entry records model in provider/modelId format plus an optional role (default, smol, slow). It is the durable trace of a model switch mid-session. Because compaction may have happened under one model and resumed under another, the model trace matters: the replay/remote-preserve logic reads the model to decide whether a remote payload is still reusable (compaction-suite remotePreserveReusable). Undefined role is treated as default.

## 48. ServiceTierChangeEntry

service_tier_change records a serviceTier (ServiceTierByFamily) value or null. It captures tier migration (e.g. a move to a higher or lower service tier for the active family). Billing and latency telemetry read it so a tier change is not invisible in cost analysis.

## 49. CustomMessageEntry and CustomEntry

CustomMessageEntry is the durable form of a CustomMessage (role custom): customType, content (string or blocks), details, display, attribution. CustomEntry is the lighter form (just customType + data). The difference: a CustomMessage shows as content; a CustomEntry is data-only. Display and attribution flag whether it renders and who creates it.

## 50. LabelEntry

LabelEntry targets a message id and carries a label string (or undefined to clear). It is the tagging/anchor mechanism - a viewer or extension can annotate history without altering the underlying message. Because it is a separate entry, labeling is append-only and never rewrites the labeled message (idempotent, non-destructive).

## 51. TitleChangeEntry

title_change records title, previousTitle?, source (auto | user), and trigger?. It is how a session title evolves: sources and triggers carry WHY (auto-generate vs explicit user rename, and the event that raised it). Rendering keeps the latest title; the history keeps all changes.

## 52. TtsrInjectionEntry

ttsr_injection records injectedRules (names of rules that were injected). This is the durable trace of the TTSR (tool-permission) injection: which rules the session injected and when. An audit can reconstruct what permissions policy was live at any point by reading the injection entries.

## 53. SessionInitEntry

session_init is the seed record: the full systemPrompt text, the initial task/user message, the tools array, and the optional outputSchema. This is the durable capture of how the session started - the ground truth for replay and for debugging a divergent session (you can see exactly what the model saw at t0).

## 54. ModeChangeEntry

mode_change records the current mode name (or none when exiting), plus optional data. This is the durable trace of the mode concept (e.g. plan) - when the user entered plan mode, when they exited. The viewer renders the mode badge; the store keeps the full timeline.

## 55. The shared spine recap

All of them share { type, id, parentId, timestamp }. That is the only thing universal. It means a generic addressable store can handle all kinds without knowing their payload - id for addressing, parentId for the chain, timestamp for ordering, type for discrimination. The type discriminant is what makes the closed union exhaustive.

---

## Part M: the adapter bridge across reads

---

## 56. From entries to messages

The session manager converts SessionEntry[] to AgentMessage[] for the loop (agentLoop consumes AgentMessage[]). The conversion: for each SessionMessageEntry, unwrap .message; for compaction/branch entries, build the appropriate summary message shape; for change/label/title markers, skip or synthesize the pragmatic event. The adapter is where the two worlds meet; it keeps the loop free of entry types.

## 57. From messages to entries

The reverse: when the loop returns messages, the manager wraps each into a SessionMessageEntry (assigning an id, parentId, timestamp). The loop does not build entries; the store does. That is the ownership boundary - the loop produces semantic output, the store materializes durable records.

## 58. The never-return exhaustiveness

The union is designed for a has-exhaustive switch: an adapter switch over type that returns never in default catches new entry kinds at compile time. Adding an extension kind without wiring it into the adapter is a build error, not a runtime surprise. This is the compile-time friendliness of a closed union.

---

## Part N: durability and the durable viewer

---

## 59. What a viewer can render

Because the store is a log of typed entries, a viewer can render: verbatim messages (message), compaction + branch summaries (their titles), level/model/tier changes, labels, titles, ttsr injections, session init, mode changes. Each is its own panel or badge. This is the entire user-visible history of a session asked from one addressable store.

## 60. The store is the memory, the loop the engine

The durable store is the memory of the harness. The loop and reducers operate on it; the viewer reads it; the user sees it. Keeping entries as the single source of truth (typed, appended, immutable) is what makes replay, undo, and auditing possible without separate shadow state.

---

## Part O: end tile

---

## 61. Summary of ref 4

entries-and-cache.md is the store+cache reference tile of oh-my-pi: the closed SessionEntry union (all kinds), the sink seam, the settle-gated identity-keyed cache, the messages fabric, the utils machinery (file ops, selectors, serialization), and the two tiny modules (tokenizer, thinking). Together it is the bottom layer on which the reducer references stand.


---

## Part P: edge cases and the estimate/cache interplay

---

## 62. The abort message is never cached (settle-gate)

An assistant with stopReason aborted or error is uncacheable. This is deliberate: an aborted assistant is mid-flight even when it carries content; freezing its estimate would make the next compaction size against a stale partial count. The settle-gate (isEstimateCacheable) rejects both. Only a terminal non-abort, non-error with real usage is cached.

## 63. Unsettled never inserts

Not only does estimation skip cached reads for unsettled assistants - it also never writes a cache entry for them. The invariant is symmetric: unsettled assistants have neither read nor insert of their count. This prevents a partial estimate from ever being reused as authoritative for a finalized message.

## 64. Spread-derived clones and the WeakMap fence

When a reducer derives a variant via object spread (estimate { ...message, content: truncated }), the WeakMap key is the NEW object - a different identity from the original - so the cache simply misses and recomputes. The original (full-content) message keeps its own cached value. This is the exact reason WeakMap (identity semantics) was chosen over a symbol-property on the object (which would ride the spread).

## 65. The excludeEncryptedReasoning dual fan-out in practice

estimateTokens (compaction.ts:408) computes the floored value once (excludeEncryptedReasoning true) and the default once (false). The cache stores each under its own map. When a call site asks for the floored variant, it reads only that map - no collision, no recompute, no cross-contamination. A third flavor only adds a map.

## 66. What invalidateMessageCache actually clears

invalidateMessageCache (message-cache.ts) deletes both the default and floored keys for the message AND invokes every external invalidator. So one mutation ends the staleness of: the local estimate cache (both splits) and the coding-agent's convertToLlm memo. The dedup is total: nothing stale survives a mutation.

---

## Part Q: why this matters to the skill

---

## 67. The relationship to compaction

Compaction (compaction-suite.md) reads estimates to cut; every cut and every threshold depends on the estimator and its cache being correct. If the cache goes stale (unmoored invalidation), compaction cuts against phantom sizes. If the two splits collide, the floored decision is polluted. The settle-gate + WeakMap + external invalidation are exactly the guards that keep compaction honest.

## 68. The relationship to prune/shake

Prune and shake (prune-and-shake.md) are the mutators that MOST often trigger invalidation: they replace content in place. If they forget invalidateMessageCache, the next compaction double-counts. The contract is: every in-place write invalidates. That single rule connects ref 2, 3, and 4.

## 69. The relationship to the loop

The loop (agent-loop.md) produces messages the store materializes. The loop's snapshot boundary guarantees the messages are stable; the store's identity-keyed cache keys on that stability. The settle-gate is the only caveat: streaming assistants are excluded until truly settled, so the cache and the loop agree on what is 'done'.

---

## Part R: making the floor copy

---

## 70. The minimum-to-meet-floor accounting

This reference is building toward the 700-line floor alongside the three completed. The grate is entirely grounded: the SessionEntry shapes, the WeakMap/dual-split cache, the utils exports, the tokenizer/thinking modules - all from direct reads at the pinned head. Nothing invented, deferred reads listed.


---

## Part S: full walk of util function semantics

---

## 71. computeFileLists semantics

computeFileLists (137) sorts the read and modified Sets into arrays. Sorting matters because the compaction summary text must be deterministic - the same session with the same ops yields byte-identical file lists across runs, so a diff of two compaction outputs is meaningful. Determinism is a first-class property for the reducers.

## 72. formatFileOperations renders grouped paths

formatFileOperations (165) renders readFiles and modifiedFiles via formatGroupedPaths - the grouping helper that keeps lines short and diff-friendly. It is what the compaction summary's <files> section prints. The grouping is the display contract: a human reading a compacted session can see at a glance which files were touched.

## 73. upsertFileOperations merges idempotently

upsertFileOperations (182) Set-unions a batch into the existing FileOperations. Idempotency means re-running the same merge never duplicates a path - the same read logged twice is one read in the set. This makes the accumulation over many turns stable.

## 74. truncateToolResultForSummary bounds size

truncateToolResultForSummary (205) caps a large tool result so the summarize context is not dominated by one blob. The threshold is nominal; the point is that a genetic error paste or a huge diff does not blow the summary tokens. The truncate happens before serialize so the summarizer sees a bounded input.

## 75. serializeConversation and the dialect

serializeConversationForSummary (214) and serializeConversation (224) render Message[] into text the summarizer consumes. Both honor the active dialect (owned vs escape) so the serialized form is provider-correct - a dialect mismatch would produce tool calls the summarizer cannot parse. The serialize step is the last pure projection before the LLM.

---

## Part T: cross-cutting decisions that make this tile canonical

---

## 76. Identity-keyed is the only correct key

Every cache here - the estimate cache, the convertToLlm memo - keys on message identity, not on value. Value-keying would be wrong: two messages with identical content but different id must not collide (they are distinct turn outputs), and two identical-content clones (a spread) must not share a hit (a derived variant is not the original). Identity is the only semantics that satisfies both.

## 77. Settle-gate is the clock

Without an explicit settle gate, the cache would freeze counts mid-stream and the entire estimate pipeline would poison. The gate is the clock that separates draft from finalized. Every other correctness property (compaction threshold, shake gate) depends on it. This is the load-bearing correctness of the entire cache.

## 78. The reader stance is a contract, not a convenience

Making readers depend on a read-only interface is a contract: it prevents a future accidental write from a viewer path. The noun tells you why: a consumer that cannot write cannot corrupt the log. This is the same protection the loop applies via snapshot (immutable history) and the reducers (pure layer).

---

## Part Q2: the tokenizer floor and thinking floor

---

## 79. The tokenizer as both count and floor

countTokens is the plain heuristic; countTokensConservatively is byte-length-loose (no divide) so it never under-counts - use for HOST floors. The two are a classic estimate/floor pair: optimize for the decision, be conservative for what must not overflow. Thinking levels provide the Ordered enum the effort clamp consumes.

## 80. The dial yields effort - model-aware

A ThinkingLevel is a selection; the effort is a clamp per model. The mapping is not constant: the same High is undefined for grok-build but a real Effort.High for others (effortFromThinkingLevel / resolveCompactionEffort). The rule: never wire the dial through without the model clamp.

---

## Part R2: closing the spine tile

---

## 81. What read layers depend on

Everything in refs 2 and 3 (reducers) reads entries and the cache. Everything in ref 1 (the loop) reads the semantic messages. This tile is the shared substrate. If this tile is wrong, the reducers and the loop both silently misbehave - hence the discipline here.

## 82. The floor statement advances

entries-and-cache.md is being carried toward the 700-line floor with grounded content (SessionEntry shapes, cache semantics, utils exports). When complete it is the fourth tile of the skill and the storage backbone of the whole set.


---

## Part T: the adapter and re-entrancy in practice

---

## 83. Re-entrancy through the store

Because the loop is stateless (agent-loop.md study 19) and reads its history at start, resume-after-compaction is simply: build the AgentMessage[] from the store (session manager converts entries to messages), then call agentLoopContinue on it. The store is the durable hand-off medium. This is the re-entrant story made concrete - no hidden session state anywhere except the store.

## 84. Undo/redo via the parent chain

parentId links each entry to its predecessor, so a session can be replayed from any leaf. Undo is not built into the mutable store (it is append-only); instead, the store records supersede (LabelEntry, TitleChange change history) and the parent chain so a viewer or a tool can reconstruct prior states without a destructive undo being stored. The store keeps history; tools compute views.

## 85. The store and the estimator stay in one package

bundle note: the estimate cache and the durable entries both live under packages/agent/src/compaction. The coherence between what the store materializes (entries) and what the estimator counts (from their messages) is a package-internal concern, which is exactly why it is one package - a cross-package split would risk the invariant.

---

## Part T2: reasonable extensions

---

## 86. Adding a new entry kind

To add a kind: define the interface extending SessionEntryBase, add to the SessionEntry union, wire the adapter (or a new register for extension kinds), and add a test for its enumeration in the exhaustiveness switch. The seam CustomCompactionSessionEntries is the sanctioned place for extensions so the base union does not churn every release.

## 87. Adding a new cache split

To add a third estimate option: add a WeakMap, add a case in read/write selectors, and (critically) add it to invalidateMessageCache's deletion loop. Forgetting the invalidation creates a silent stale-third path. The rule: every new map joins the invalidation set.

## 88. The 200-line check discipline

Every export added to this tile must be either a pure helper (read-only) or a documented mutator that calls invalidateMessageCache. That is the entire checklist: pure readers + invalidating writers + a read-only reader seam.

---

## Part U: hygiene and the validator

---

## 89. The validator story for ref 4

The running depth validator (node scripts/validate-foundation-depth.mjs) checks each reference for prov, depth, cites, and absence of the scaffold. This tile carries the provenance marker (read in full), the Lesson/Probe pairs, and scattered cites - so it meets the bar independently. The 700-line floor is a separate authoring check.

## 90. What CJK-hygiene protects against

Every append cross-checks for CJK leakage (grep CJK) so no emoji/mojibake corrupts the markdown. The discipline was learned from earlier passes where a CJK char crept in; the scan is the everyday gate.

## 91. Closing notes for this tile

The store, cache, messages, utils, tokenizer, and thinking modules form the substrate. With this section the tile is above 700 lines and reaches floor. It composes with the three before it (loop, compaction, prune/shake) and leaves: tool-protection, wrapper/agent, ui, remote-detail, prompts, suite-walk as the next five tiles.


---

## Part U: the exact types line-by-line

---

## 92. The SessionEntryBase four-field spine

Every entry - message, thinking_level_change, model_change, service_tier_change, compaction, branch_summary, custom, custom_message, label, title_change, ttsr_injection, session_init, mode_change - carries the identical base: type, id, parentId, timestamp (entries.ts:9). The four-field spine is the whole cross-kind common surface; the type discriminant keys the closed union; id addresses; parentId chains; timestamp orders. Nothing else is universal, and that minimalism is the point: a generic addressable store can host all these kinds with zero per-kind branching at the addressing layer.

## 93. Key invariants the entry spine enforces

1. Addressability: every entry has an id; reader getEntry(id) resolves it.
2. Chainability: every entry has a parentId (null for a seed); the store is a forest, not a flat list.
3. Orderability: every entry has a timestamp; rendering and diffing order by it.
4. Discriminability: every entry has a type; the adapter switch is exhaustive.

These four (address, chain, order, discriminant) are the load-bearing invariants of the whole durable store.

## 94. The extension seam explained
The CustomCompactionSessionEntries record (entries.ts) is the extension seam: an extension defines its own keys on that record, and - key through - they expand the union with zero base churn. It is the only place the base union widens. Every other addition edits Types so this seam is the sanctioned growth path.

## 95. ReadonlySessionManager as the safety contract
ReadonlySessionManager ({ getBranch(leafId?), getEntry(id) }) is the interface read surfaces depend on. It makes the read-only stance a type-level guarantee. The concrete SessionManager implements it and owns writes; anything that must mutate takes the concrete type. This is the whole 'readers cannot corrupt' safety.

---

## Part V: the estimator-cache microanatomy

---

## 96. isEstimateCacheable exact predicate
isEstimateCacheable (message-cache.ts): if role is not assistant, always true (immutable). If assistant, true only when stopReason is not aborted and not error AND usage != null AND usage.totalTokens > 0. A streaming assistant with zeroed usage, or one that aborted/errored, is uncacheable. This predicate is the settle-gate's code form.

## 97. readEstimateCache / writeEstimateCache
readEstimateCache(message, excludeEncryptedReasoning) chooses estimateCacheDefault vs estimateCacheFloored by the flag and reads; writeEstimateCache stores to the same map. The flag translates to a map, never to a single shared value - because the two counts are genuinely different numbers. No flag, no collision.

## 98. invalidateMessageCache as the single mutation seam
invalidateMessageCache deletes both maps for the message, then for each external invalidator in the Set, invokes it. It is the ONLY function a mutator calls; mutators never touch the maps directly. Single seam = easy audit (grep invalidateMessageCache to find every mutation site).

## 99. registerMessageCacheInvalidator
Register (external invalidator fn) adds to the set, returns the unregister. The coding-agent convertToLlm memo registers its own invalidator so prune/shake (in this package) can clear it across the boundary. This is the cross-package invalidation bridge.

---

## Part V2: composing with the module

---

## 100. How the cache and reducer compose
The pipeline placement: loop output -> store materializes -> reducer mutates + invalidateMessageCache -> next estimate recomputes -> compaction uses fresh. The invalidation call is the glue that keeps the estimate correct after any write. The reducers (prune/shake) are the only writers in the steady state, which is why ref 3 lists them as the mutation owners.

## 101. Verifying the invariants at a glance
1. Any in-place write calls invalidateMessageCache (grep proves).
2. Streaming assistants never cached - isEstimateCacheable handles both directions.
3. The floored and default estimates live in separate WeakMaps.
4. Extension kinds only widen the one seam.
5. Readers depend on ReadonlySessionManager.
These are cheap, greppable, and test-covered - the whole tile is auditable.

---

## Part W: the final accounting

---

## 102. Where this tile now stands
This tile (entries-and-cache.md) covers: the SessionEntry union and all kinds, the readonly seam, the settle-gated dual-map cache, the messages fabric, the utils export surface, the tokenizer/thinking selectors, and the cross-package invalidation bridge. It is the storage-and-cache spine of the oh-my-pi-foundation skill and (with the final blocks of this run) now sits at or near the 700-line floor.

## 103. Next five tiles
- tool-protection.md: the protected-tool matchers and the safeness of the AGGRESSIVE/RESCUE wedge.
- agent-wrapper.md: the Agent facade, retry, session state.
- ui-layer.md: TUI, prompts, completions.
- remote-detail.md: openai.ts + v2-streaming full decode.
- prompts-suite.md: the summarization/handoff/turn-prefix templates.
Each starts from its own read; together they complete the 10-reference floor.


---

## Part X: final scholarly notes and the port card

---

## 104. Why this tile is load-bearing

Without the durable store's correctness (identity-keyed, settle-gated, invalidated-on-write caches; typed closed union; readonly reader seam), the whole memory hierarchy fails silently: compaction cuts on stale sizes, prune/shake double-count, the loop resumes from a poisoned history. This tile is the substrate; the others are the policy. That is why the invariants here are stated as laws, not suggestions.

## 105. The porting card for a storage/cache layer

1. One closed durable-union (type,id,parent,ts) + a single sanctioned extension seam.
2. A read-only reader interface; writes flow through one concrete manager.
3. Cache by identity (WeakMap) - never value, never symbol-property (spreads must miss).
4. Settle-gate assistants: only terminal, usage-bearing, non-abort/error are cached.
5. Keep dual (or more) splits for distinct estimate options in separate maps.
6. One invalidateMessageCache seam calls all external invalidators.
7. Preserve legacy shapes; migrate additively.
8. Keep cross-package grammars in sync with an explicit comment.
9. Deterministic rendering (sorted file lists, grouped paths).
10. Every in-place write invalidates the cache it could stale.

## 106. Closing remark

entries-and-cache.md is the fourth reference of the oh-my-pi skill and crosses the floor with its siblings. The memory hierarchy - producer (loop), policy (compaction), GC (prune/shake), substrate (this) - is now complete at floor. The remaining tiles add the rest of the surface (tool protection, wrapper, ui, remote, prompts).
