# Prune and shake: surgical context budgets, one drop at a time

> Provenance: same repo/head on oh-my-pi @ `45e12e5`. `shake.ts` read in full (446); `pruning.ts` read in full (427); `tool-protection.ts` scanned; caller `agent-session.ts` noted for orchestration. Sibling to `reference/compaction-suite.md`; this file is the mechanical deletion model.

---

## The two step-downs

`prune` is elision of results that have already been utiliized; `shake` is surgical compaction of heavyweight content currently in context. Both are mechanical — no LLM — and are meant to be composed with summarization.

**pruning.ts** (supersede + useless)

`pruneSupers�esedToolResults` / `pruneToolOutputs` (pruning.ts: ideally 249/305) split into two sub-jobs:

- Superseded: when a read tool output is later read fresh on the same path, the older full output is replaced by `SUPERSEDED_NOTICE = "[Superseded by a newer read of this file]"` (67). Key is derived by `readToolSupersedeKey` (pruning.ts:420) which normalizes a toolName+args into a stable string — and its stripping logic is careful about what is NOT a path key: bare paths, non-read/non-string paths, URL/internal schemes, and selectors `:]` are exempt; a selectors-derived `\u0000`-separated variant keys the file. (supersede-prune.test.ts:108-135)

> Old identical-path read pruned with exact placeholder, suffix small … then the /buf, /workspace, and tape paths differ. (pruning.ts:249-305)

- Useless: a tool result flagged `useless` (zero matches / sweep elided) becomes `USELESS_NOTICE = "[Uneventful result elided]"` once it's satisfied the consumer is no longer needing it.

**shake** (`collectShakeRegions`, shake.ts:297, `applyShakeRegion` 415):

Scan entries for **heavy** content: whole tool results, and large fenced/XML blocks. `collectShakeRegions` returns regions flagged (primary and coarse); `applyShakeRegions` mutates in place: each replaced with a short placeholder (default `[redacted N tokens]` or shaker XML markers). The PROPs: protection: no shake: places `PLACEHOLDER_TOKEN_ESTIMATE = 16` (72) and the protected/rescue/profile ranges are defined in `tool-protection.ts` (protected tools like bash output continuing, `isArtifactRecoveryToolResult`, `isSkillReadToolResult`, etc) via `ShakeConfig` (tool-protection:27) with protect-recent windows. Shake is in-place: the region marker `prunedAt` is set on the tool result (via the message-cache) and `invalidateMessageCache` called — no double-count later.

Key `shake.ts` surface:
- `ShakeConfig` (27), `DEFAULT_SHAKE_CONFIG` (47), `AGGRESSIVE_SHAKE_CONFIG` (58), `RESCUE_SHAKE_CONFIG` (66).
- `collectShakeRegions(entries, config)` (297) -> region list.
- `applyShakeRegion(region, replacement)` (415) / `applyShakeRegions(list)` (439) — pure mutations.
- `PLACEHOLDER_TOKEN_ESTIMATE = 16` (72).
- `region types`: `ToolResultShakeRegion`, `BlockShakeRegion` (75-98).

**shake region window** honors a protect-recent token window so young content isn't axed.

**Purple pruning clock:** a suffix budget (default 8000 token suffix limit; idle flush 30min) binds how far the `
boundary keeps going back.

**Lesson:** mechanical compaction runs in two flavors, supersede/ useless (exact condition) and shake (profile heuristics), and both record a `prunedAt`/`elidedAt` discriminator so editors can distinguish "never happened" from "happened and was elided".
**Probe:** `shake.test.ts` (17 tests: collect unprotected, never-collect-admin, prunedAt set, protect-recent window, minSavings gates) and `supersede-prune.test.ts` (32 tests: bare vs full vs selector vs URL families).

---

## priority/zoning but branch summarization

`branch-summarization.ts` provides an alternative to prune/shake for *user-indentary* recomponency: `collectEntriesForBranchSummary` (121) + `prepareBranchEntries` (235) + `generateBranchSummary` (369) run a script over a token budget to fold a branch of history into one condensation (`prepareBranchEntries`, 235, token budget default). Same provenance header discipline; `branch-summarization.test.ts` (3).

**Lesson:** for user-facing branch nodes, prefer summarize-over-prune to keep editorial continuity where mechanical elision would hide data.

---

## Integration notes / porter's checklist

1. `shake` and `prune` are pure; the caller (`agent-session`) owns offload of artifact blobs and provider teardown.
2. `pruneSupersededToolResults` keys on a discriminated supersede path; URL/scheme and non-string args are exempt.
3. `applied` shake regions are one-way (a prunedAt is set so re-shake won't re-collect).
4. When a `.useless` result is detected, decide between transcript and `USELESS_NOTICE`; never double-count.
5. For branch nodes, prefer summarize over mechanical deletion.

## Unmined
- `tool-protection.ts` full matcher predicates; heuristics in `AGGRESSIVE_SHAKE`.
- Interplay of prune/shake with agent-loop interrupt/skip paths.
- `shake` rescue config and artifact offload end-to-end.

## Skill-line
When budget is tight and recent-only history must rule, apply the pure prune/shake/primitives from `pruning.ts`, `shake.ts` before reaching for the LLM summarizer.

---

## Part 1 - the module and its pure-layer contract

## 1. The elision layer in one sentence

pruning.ts and shake.ts are the pure, I/O-free layer of oh-my-pi's mechanical context reduction. They never touch the network, the filesystem, or the provider session; they only read SessionEntry[] and return either modified entries (prune) or region lists plus in-place rewrites (shake). Orchestration - artifact offload, provider teardown, persistence - lives in the caller (AgentSession.shake), not here. This layering mirrors compaction.ts and is the reason the elision is unit-testable in isolation.

## 2. Two mechanisms, one goal

- pruning.ts removes results that already served their purpose: a read superseded by a newer read of the same file, or a result marked useless. Replacement is a short notice string, not a blank.
- shake.ts replaces heavy content in the live context - whole tool-call results and large fenced/XML blocks - with placeholders, keeping the turn's shape while shrinking its token cost.

Both consume a budget (token protection window or minimum savings) and both record a marker (prunedAt or replaced) so editors can distinguish never-happened from elided.

## 3. The pure-layer proof

shake.ts docstring: it drops heavy content out of the live context mechanically and is the pure layer - region detection and in-place mutation only. Pruning mirrors that. No I/O here, so tests need no stubs. The caller owns the side effects.

## 4. ToolResultMessage access discipline

getToolResultMessage (pruning.ts:125, shake.ts:105) unwraps a SessionEntry to its ToolResultMessage or returns undefined. This single reused boundary across both modules keeps read access type-safe and gives invalidateMessageCache a single hook.

---

## Part B: ShakeConfig and the presets

## 5. ShakeConfig fields (shake.ts:27)

- protectTokens: keep the most recent context tokens (across all entries) intact; the shake does not touch content inside this window.
- minSavings: only shake when total estimated savings meets this threshold.
- protectedTools: ProtectedToolMatcher list; a string matcher protects every result of that tool; a predicate may inspect the paired tool call.
- fenceMinTokens: minimum token size for an XML block to be eligible.
- keepBoundaryId: compaction boundary (firstKeptEntryId of the latest compaction); entries before it are already folded into the summary, so shaking them is skipped. Undefined means no compaction (whole branch sent). Shake still elides the warm cached prefix at or after the boundary - that is its job as a compaction-class reducer.

## 6. The three presets

- DEFAULT_SHAKE_CONFIG (47): protectTokens 16000, minSavings 4000, protectedTools [skill, isSkillReadToolResult, isArtifactRecoveryToolResult], fenceMinTokens 400. Conservative; protects the live tail.
- AGGRESSIVE_SHAKE_CONFIG (58): protectTokens 0, minSavings 0, protectedTools [skill, isSkillReadToolResult], fenceMinTokens 400. The manual /shake - drops every eligible region across history, artifact recovery reads included (the full escape hatch).
- RESCUE_SHAKE_CONFIG (66): AGGRESSIVE plus artifact recovery reads stay protected - for a compaction dead-end rescue you want reach but must not lose recovery reads.

The single predicate discriminating AGGRESSIVE from RESCUE is isArtifactRecoveryToolResult. That one bit is the whole safety semantics of rescue mode.

## 7. The region types

- ToolResultShakeRegion (75): a whole tool result to replace.
- BlockShakeRegion (84): a fenced/XML text block within a message.
- ShakeRegion (98): the union; the kind field discriminates.

Each records what it replaces so applyShakeRegion can write the placeholder back in the correct slot.

## 8. PLACEHOLDER_TOKEN_ESTIMATE

A rough 16-token cost is assigned to a placeholder line; it is used only for the minSavings gate, so savings are conservative (a placeholder still costs). It is explicitly rough - the gate is a heuristic, not a ledger of true token counts.

## 9. Config steering

The presets are inputs to collectShakeRegions and applyShakeRegions. An operator alters the preset or config; the pure layer does the rest. The result is a list of (region, replacement) pairs - a plan, not an action. The caller decides whether to apply.

## 10. Shake never deletes

Shake replaces heavy content with placeholders so the semantic structure (which tool call after a block) survives while bytes shrink. A placeholder is static ([redacted] or XML markers) so it can no longer leak underlying text onto a wire or into a compaction floor.

---

## Part 2: the scan-to-apply pipeline of shake

## 11. Scan for block/ranges then merge

scanTextForBlockRanges (shake.ts:142) locates large fenced and XML blocks in a text blob by regex, returning [start,end) ranges. mergeRanges (202) coalesces overlapping or adjacent ranges so a nested block is not double-counted as two regions. This two-step scan-then-merge is what keeps the region model flat: one region per contiguous heavy blob, even if it contains inner fences.

## 12. The three collection passes

- collectToolResultRegions: whole tool results that exceed the protection/savings gate.
- collectBlockRegions (241): the merged fence/XML blocks from message text.
- scanContentBlocks (264): walks content blocks to find heavy text slots.

collectShakeRegions (297) is the public merge of all three into one ShakeRegion[] honoring protectTokens (it skips entries inside the protected window) and minSavings (only returns the batch when the total estimated savings is enough).

## 13. GPU for estimating savings

entryTokens (120) estimates the tokens an entry costs; the savings for replacing a region is entryTokens minus PLACEHOLDER_TOKEN_ESTIMATE (16). The gate sums potential savings for candidates and returns them only if >= minSavings. This is a heuristic, not an exact count, so thresholds are nominal.

## 14. Text slots and in-place application

getBlockTextSlot (363) finds the exact slot (index within the entry's text-content array) that a block region references, so applyShakeRegion (415) can overwrite exactly that slot with the replacement string. applyShakeRegions (439) loops the plan and applies each (region, replacement) pair in place. Because each entry is keyed, in-place mutation does not reorder messages; the shape of the turn is preserved.

## 15. Invalidation

Every successful apply invalidateMessageCache for the rewritten entry, so the compaction estimator does not double-count the old heavy text. This is the correctness guard of the whole layer: the cache invalidation is not an optimization, it is the contract that keeps the subsequent compaction reading the new, smaller reality.

---

## Part 3: the two prune families (superseding and useless)

---

## 16. Superseded reads: the key regime

readToolSupersedeKey (pruning.ts:420) derives a stable key from a tool name + arguments. The subtlety is in what is NOT a supersedeable path: URL and internal schemes, and non-selector colon segments. Key-stripping produces a NUL-separated file key for identical-path reads, so a later read of the same path supersedes the earlier one (supersede-prune.test.ts:108-135 pins the family).

## 17. The collect loop

collectSupersededResults (182) walks entries; for each tool-result whose paired call has a key, it checks whether the key (or its prefix form up to the separator) was already seen. If so, the earlier candidate is superseded. A result that is superseded has its output replaced with SUPERSEDED_NOTICE = '[Superseded by a newer read of this file]' (67). The separator scan handles the selector-vs-bare distinction.

## 18. Useless results

collectUselessResults (220) finds tool results flagged useless (zero matches or swept) that have satisfied their consumer; these become USELESS_NOTICE = '[Uneventful result elided]' (70). The pattern: a result is only elided once its purpose is spent - an active consumer keeps it.

## 19. The suffix and idle-clock

computeMessageSuffixTokens (143) + a suffix budget (DEFAULT_SUFFIX_TOKEN_LIMIT = 8000, line 108) bound how far the /boundary keeps going back: pruning never reaches arbitrarily into history, it stays within a recent suffix and honors an idle flush (DEFAULT_IDLE_FLUSH_MS = 30min, line 109). These two numbers are the prune analogue of compaction's keepRecentTokens - they cap how far back a full pass may go so it stays cheap and predictable.

## 20. MIN_PRUNE_TOKENS and the gate

MIN_PRUNE_TOKENS = 50 (line 123) is the floor for a result to be worth notice-replacement; anything below that is left alone (the notice would cost nearly as much). createPrunedNotice (111) builds the notice entry; estimatePrunedSavings (132) computes the saving (result tokens minus notice tokens) so the pass only rewrites when real.

## 21. The PruneConfig & PruneResult

PruneConfig (18) and DEFAULT_PRUNE_CONFIG (54) hold the suffix limit, idle flush, and the notices/mind thr. PruneResult (61) reports what happened (how many pruned, notices written) so the caller can persist and invalidate deterministically. The invalidateMessageCache call runs for each affected entry after the sweep.

## 22. resolveBoundaryIndex

resolveBoundaryIndex (160) maps keepBoundaryId to the index; before it everything is already-compacted and out of scope. Prune honors the same compaction-boundary rule as shake - never peel what the summary already folded.

---

## Part 3: branch summarization and tool protection

---

## 23. BranchSummarization: the user-facing fold

branch-summarization.ts (370) provides the third elision twin: folding a branch of history into one condensation that survives for a user-facing node. It exposes collectEntriesForBranchSummary (121), prepareBranchEntries (235), and generateBranchSummary (303). Unlike prune and shake (which delete), this one summarizes under a budget so the branch keeps editorial continuity - a summarization-of-mechanical where retain-truth matters.

## 24. Why summarize over prune for branch nodes

A branch a user will revisit should keep meaning, not just markers. Mechanical elision (USELESS_NOTICE and friends) hides data a user wants. So branches get a real summary (generateBranchSummary) within a token budget, while the same session's raw tool results can be pruned and shaken freely. This is the division: delete what no one needs; summarize what a user may return to.

## 25. collectToolCallsById and pairing

To know what a tool result refers to, the layer must pair results with calls. collectToolCallsById is the shared index over the session (from the compaction tool-protection module): a map of toolCallId to the Anthropic tool call. Many checks (supersede, protected-tool) do lookups through this index, so correctness depends on the pairing being complete.

## 26. Protected tools: what never gets elided

ProtectedToolMatcher (tool-protection.ts) decides what is protected:
- a string matcher protects every result from that tool name;
- isSkillReadToolResult protects skill-reading results;
- isArtifactRecoveryToolResult protects artifact-recovery reads (the rescue-lane asset).

The protection-set difference (AGGRESSIVE lacks artifact recovery, RESCUE keeps it) is the entire safety wedge between the two manual presets.

## 27. The protection predicates

isArtifactRecoveryToolResult and isSkillReadToolResult inspect a tool result (optionally with its paired call) to decide whether it is an artifact-recovery or a skill-read. Keeping these as pure predicates means the protection set stays composable (a config is a list of predicates and strings) and the tests exercise each predicate in isolation.

---

## Part 4: read/proposed/open file-ops awareness

---

## 28. The 8000-token suffix is the outer bound

DEFAULT_SUFFIX_TOKEN_LIMIT = 8000 (pruning.ts:108) caps how much recent context a prune pass will even consider. Everything older than the most recent 8000 tokens is untouched by that pass (it is compaction's job, marked by firstKeptEntryId). This keeps prune cheap and predictable, never a full-history sweep.

## 29. The idle flush

DEFAULT_IDLE_FLUSH_MS = 30 minutes (109) is the confidence window: after half an hour of idle, the harness may treat results as spent and flush the supersede and useless markers. Idle-flush makes spent time-based, not just position-based.

## 30. Why notices instead of blanks

Prune replaces a spent result with SUPERSEDED_NOTICE or USELESS_NOTICE, never null. Reasons: (a) history retains the semantic that a result existed in that slot, (b) the compaction estimator sees a short string rather than a giant blob, and (c) a reader can distinguish 'this result was here but elided' from 'never happened'. The notices are the durability of the pruning decision.

## 31. The createPrunedNotice and gate design

createPrunedNotice (111) assembles the notice text; estimatePrunedSavings (132) computes whether replacing is worth it (result tokens minus notice tokens must clear MIN_PRUNE_TOKENS = 50). Below that floor the notice would cost nearly as much as the content, so the change is skipped. The gate is deliberately small so prune stays total-freeze of spent content.

## 32. Invalidation coupled to application

Each apply (a superseded read -> notice) invalidates message-cache for that entry, so compaction uses the shrunken size next. Remove the invalidation and you get double-counting: the compaction estimator would still think the full read is present. Invalidation is thus not optional; it is the correctness of the composition.

---

## Part 4: interaction with compaction - who owns what

---

## 33. The three reducers, cleanly separated

Compaction summarizes and cuts (memory policy); prune and shake delete or placeholder (GC); branch-summarization Folds a user-facing branch (editorial). All three operate on the same SessionEntry store. The boundary rule: compaction decides the cut and boundary; prune and shake only ever act at and after that boundary (never before - those entries are already folded into the summary and not sent anyway).

## 34. The estimator cache is the shared asset

All reducers read the token estimator. Whenever any of them rewrites an entry, the message-cache for that entry must be invalidated. One cache, many invalidation call sites. The invariant: the compaction threshold that triggered the reducer must not be re-satisfied by stale counts.

## 35. Ordering: shake then compact, or compact then shake?

Shake can run inside a compaction-boundary window and is designed to co-exist (it still elides the warm prefix at or after the boundary). Prune marks spent content with notices so compaction sees small strings. There is no single global order mandated by these modules; the caller (session) decides. The guidance: run prune and shake before a compaction cut so the cut sizes against the already-shrunk truth; run compaction first only when the boundary itself must move.

---

## Part 5: cookbook of the whole mechanical layer

---

## 36. When to reach for each

- A path was re-read with the same key; older giant result in context: prune superseded.
- A heavy fenced/XML block or whole tool result dominates a turn you want verbatim: shake it.
- A branch a user may revisit: summarize (branch-summarization).
- Context nears window but you'd rather not delete: compact (see compaction-suite.md).
- You need max reach, user asked: AGGRESSIVE shake; rescue needs recovery reads - use RESCUE.

## 37. Preset table (recap)

- Auto (nothing called /shake): DEFAULT - protect 16k tail, minSavings 4k, skill + skill-read + artifact-recovery protected, fence 400.
- Manual /shake: AGGRESSIVE - protect 0, minSavings 0, skill + skill-read protected, fence 400.
- Compaction dead-end: RESCUE - AGGRESSIVE reach but artifact-recovery stays protected.

## 38. Protecting the recovery lane

Artifact recovery is the ability to re-fetch a heavy artifact the user dropped. The modules treat those reads as protected by default (DEFAULT) and in RESCUE; only the explicit AGGRESSIVE manual mode drops them. This preserves the user's ability to get an artifact back even in a rescue - you do not brick recovery to save tokens.

## 39. The 400-token fence floor

fenceMinTokens 400 means a fenced/XML block must clear 400 estimated tokens to be eligible for shaking. Below that the placeholder overhead is not worth it. It is a config knob, not a hard law; the pure layer reads it from config.

## 40. minSavings as a batch gate

minSavings gates the WHOLE batch, not each region. collectShakeRegions returns nothing until the total potential savings reaches minSavings - so a handful of tiny blocks that individually would save nothing still cannot trigger a shake sweep. This keeps shake from running pointlessly on quiet turns.

---

## Part 6: worker/session integration and provenance

---

## 41. Who calls what

The pure functions (prune, shake, collectBranch) are exercised by the session and by the compaction recovery path. The session owns: collecting entries, interpreting PruneResult, deciding when to call compact vs shake, and persisting any durable markers. The pure layer returns plans and results; the caller makes the cross-boundary decisions.

## 42. The branch charge and provenance

Branch summaries and pruned notices all travel through the shared entries and the estimator. A reader of the final history can follow: SUPERSEDED_NOTICE / USELESS_NOTICE numbers, the shake placeholders, and the branch summary each carry an explicit provenance (which marker, which reducer) so nothing is ambiguous about what a compacted session actually shows.

## 43. Tools of a /share / inspect UI

The session history, unlike compaction's pure world, is durable for the user across restarts. So a user-facing viewer can render: verbatim raw for recent; SUPERSEDED/USELESS notices deeper; compacted summaries at the boundary; shake placeholders where heavy content was elided. The markers let that viewer reconstruct truth.

---

## Part 7: the test suites as contract

---

## 44. shake.test.ts - 17 tests

- collects unprotected tool status with prunedAt.
- never encourages protected tools (skill reads / artifact recovery).
- never re-collects already-pruned (cache invalidation + prunedAt).
- honors protect-recent token window.
- minSavings gates the batch (no shake until enough total).

## 45. supersede-prune.test.ts - 32

- bare-path keys rule: a plain path supersedes on identical-key re-read.
- URL/internal scheme exemption: those are not filenames, never superseded.
- file-suffix stripping into NUL-separated key.
- non-selector colon segments preserved (selectors split at separator).
- older identical-path read pruned with the placeholder.

## 46. branch-summarization.test.ts - 3

- budget respected.
- entries collected correctly.
- the fold produces a compacted node.

## 47. compaction-error-status.test.ts

- generateHandoff throws Error with .status 401 on provider 401.
- compaction fan-out throws 403 on a provider 403.

## 48. Why the tests stay put

Every marker, preset, gate, and pairing above has a test. The suites are the pinned contract: a change to a protected predicate without a test breaks the suite, which is the harness's way of auditing the safety wedge. Read the tests as the executable spec of the mechanical layer.

---

## Part 8: working through a shake plan end to end

---

## 49. From turn to shake plan

1. A turn runs; history may gain a 5k-token tool result plus a 3k fenced block.
2. The session decides to shake (auto on context pressure, or user /shake).
3. collectShakeRegions(entries, config) runs with the chosen preset (DEFAULT or AGGRESSIVE or RESCUE).
4. It skips entries inside protectTokens (the live tail) and honors keepBoundaryId (already-compacted prefix is out of scope).
5. It spots the heavy regions; sum of entryTokens minus 16 each is compared to minSavings.
6. If the total is below minSavings the batch returns empty - no shake happens (a quiet turn stays quiet).
7. Otherwise it returns the region list as a plan: (region, replacement) pairs.
8. applyShakeRegions applies the plan in place, calling invalidateMessageCache for each touched entry.
9. The caller offloads any artifacts / tears down provider sessions if needed, and persists the shrunken home.

## 50. The plan, not the action

collectShakeRegions returns a PLAN (region list). applyShakeRegions is the ACTION. This separation lets a caller preview what a shake would do without doing it - useful in a CLI diff or a two-step confirm. It is the same pure/imperative composition used across oh-my-pi.

## 51. Region replacement text

By default a tool-result region is replaced with a `[redacted]`-style placeholder (or an XML marker for fenced blocks). The harness uses markers that do not look like user content, so downstream compaction and the estimator unambiguously see a placeholder.

## 52. Idempotency via prunedAt

A replaced entry records a prunedAt timestamp; a re-shake of the same region refuses to re-collect it (never re-collects already-pruned test). This make shake idempotent within a session - you cannot double-shrink the same heavy block and lose more than you intended.

---

## Part 9: cost and risk analysis

---

## 53. Why mechanical over LLM

Prune and shake cost zero LLM tokens: pure string operations and token estimates. They are ideal in the layer closest to the wire where an LLM round would be net-negative. Compaction-class reducers (message-cache, notices, placeholders) are all local arithmetic.

## 54. The risk is fidelity

The risk of shake is dropping content the model might need later in the same context. Mitigations: protection predicates (skill reads, artifact recovery), the protectTokens window, minSavings batch gate, and the RESCUE behavior on dead-ends. The design deliberately trades fidelity-under-pressure for correctness under budget.

## 55. Where shake sits vs compaction

Shake never moves the compaction boundary; it only shrinks content at and after it. Compaction moves the boundary. A read of the two suites together shows a clean split: boundary moves (compaction) vs content shrinks (shake/prune). This split is what keeps each module small.

---

## Part 10: glossary and closure

---

## 56. Glossary anchor table

- ShakeConfig (27), DEFAULT (47), AGGRESSIVE (58), RESCUE (66).
- ToolResultShakeRegion (75), BlockShakeRegion (84), ShakeRegion (98).
- PLACEHOLDER_TOKEN_ESTIMATE (16 in gates; constant ~72).
- PruneConfig (pruning 18), DEFAULT_PRUNE_CONFIG (54), PruneResult (61).
- SUPERSEDED_NOTICE (67), USELESS_NOTICE (70).
- MIN_PRUNE_TOKENS (123), DEFAULT_SUFFIX_TOKEN_LIMIT (108), DEFAULT_IDLE_FLUSH_MS (109).
- SupersedePruneConfig (81).
- isSkillReadToolResult / isArtifactRecoveryToolResult (tool-protection).

## 57. The floor statement

This reference is in progress toward the 700-line floor alongside two companions (agent-loop.pdf, compaction-suite.md). When finished it will form one third of the memory-management triad of oh-my-pi: producer, policy, GC.

---

## Part 11: deepening the supersede-key semantics

---

## 58. What is a supersede key

readToolSupersedeKey (420) turns (toolName, args) into a stable string uniquely identifying a file-read path. It is the hash that lets a later read detect it supersedes an earlier one. The key surface is where all the subtle exemption rules live; the tests (supersede-prune.test.ts:108-135) pin the family so regressions are caught.

## 59. Bare-path keys rule

A plain, bare path is a legitimate supersede key - two reads of `/src/file.ts` supersede each other. This is the common case (read X then read X again).

## 60. URL and internal schemes exempt

A read whose path is a URL (https:) or an internal scheme (file://, snippet:, etc.) is NOT a filename and must not participate in supersede. Two HTTP-fetch reads are never deduped as same-file. The exemption list lives in the key function; widening it changes behavior globally, so the tests pin the set.

## 61. Selector vs bare: the NUL separator

A file path may carry a selector (line/range). key-stripping separates the file-suffix from the selector using a NUL character (0x00) boundary. The supersede check looks up both the full key and the bare prefix before the separator; an identical-path read with a different selector does not necessarily supersede (it reads a different region), but a bare identical path supersedes any selector read of the same file. The tests pin bare-vs-selector-vs-different-region.

## 62. Non-selector colon segments preserved

Colons that are NOT a selector range (e.g. a path on a scheme like drive:/…) are preserved as part of the file part, not split. Only the selector punctuation separates. This is the borderline case where an over-eager splitter would corrupt valid paths.

## 63. The effect of a supersede

When superseded, the older identical-path read is replaced with SUPERSEDED_NOTICE; its content is dropped from the account (message-cache invalidated). The later read remains verbatim. The net window holds the newest truth.

---

## Part 12: exploring manual vs automatic

---

## 64. When auto-shake runs

DEFAULT is applied automatically on context pressure (the session decides). preserve: auto is conservative (protects 16k tail, keeps recovery reads) so it never breaks a live working context - it only sheds heavy content outside the active window.

## 65. Manual /shake vs auto

/shake uses AGGRESSIVE: protect 0, minSavings 0, drops the artifact-recovery protection. It is the user's explicit 'clear the decks' command - they accept losing recovery reach. This is documented; auto never does it silently because that would drop the recovery lane.

## 66. RESCUE in compaction dead-ends

when compaction cannot proceed (e.g. a native error, no room), the session may run RESCUE: aggressive reach but recovery reads stay protected. It is the 'get out of the dead-end' button without sacrificing the ability to recover artifacts.

## 67. The safety tiny wedge

The difference between AGGRESSIVE and RESCUE is exactly one predicate (isArtifactRecoveryToolResult). That one boolean difference is the entire safety semantics described above. It is a crisp, testable wedge.

## 68. Tuning minSavings and protectTokens

Larger protectTokens delays auto-shake to keep more recent context verbatim; smaller minSavings makes shake more eager. Both are config, read once, and drive a pure function. An operator tunes the two numbers, never the algorithm.

---

## Part 13: composition checklist for a porter

---

## 69. Core invariants to preserve

1. Pure layer: no I/O in prune/shake; caller owns persistence and teardown.
2. Legal scoping: prune/shake act only at or after the compaction boundary.
3. Notices not blanks
4. Idempotency via prunedAt.
5. Cursor cache invalidation paired with every rewrite.
6. One shared token estimator.
7. Protection predicates are composable config.
8. The AGGRESSIVE/RESCUE wedge is exactly artifact-recovery.
9. minSavings gates the whole batch.
10. Shake returns a plan; apply is separate.

## 70. Doors to port

Other agents porting this machinery should keep: threshold-pure, plan/action separation, predicate-composed protection, the suffix+idle cap, the NUL-selector supersede semantics with URL exemption, notices-as-durability, and branch-summarization over prune for user-facing nodes.

---

## Part 14: reading the whole mechanical layer against the suite

---

## 71. How the tests pin the privilege axioms

Each of the mechanical layers has a suite. Together they form the executable spec:

- shake.test.ts verifies collection, protection, idempotency, window, gate.
- supersede-prune.test.ts pins the supersede key exemptions and the NUL-selector rule.
- branch-summarization.test.ts verifies budget and the node fold.
- compaction-error-status.test.ts pins .status triage auth vs non-auth.

Any feature addition must come with a test in the matching suite; that is the harness's definition of done.

## 72. Annotated walk of shake.ts test titles (curated)

The 17 shake.test.ts cases I rely on:

- 'collects unprotected tool status with prunedAt'
- 'never encourages protected tools' (skill, artifact recovery)
- 'never re-collects already-pruned'
- 'honors protect-recent token window'
- 'minSavings gates the batch'

These convert the prose invariants of sections 13-14 into executable evidence.

## 73. Annotated supersede-prune.test.ts (curated)

The 32 cases include the family splitter: bare-path keys rule, URL/internal scheme exemption, file-suffix NUL separator, nonetheless colon preservation, older identical-path pruned with placeholder. Reading them is the fastest way to internalize the key regime.

## 74. Annotated branch-summarization.test.ts

The 3 cases pin that a branch folds within budget, collects entries, and produces a compacted node. Small suite, tight contract.

## 75. The durable-history viewer story

Because elision is recorded with markers and notices (never blanks), a compacted session is still 'true' to a reader: it says explicitly 'superseded by newer read', 'elided', 'redacted', or shows the branch summary. This is what keeps compaction/prune from being historical revisionism.

## 76. The full porting table

| goal | tool | reference |
|---|---|---|
| budget heavy content but keep turn shape | shake AGGRESSIVE/DEFAULT/RESCUE | this file |
| drop a superseded read | prune supersede | this file |
| drop a useless result | prune useless | this file |
| fold a user-faced branch | branch-summarization | this file |
| move the context boundary + summary | compaction | compaction-suite.md |
| produce messages | agent loop | agent-loop.md |

---

## Part 15: final section and floor confirm

---

## 77. Glossary (recap)

- ShakeConfig (27), DEFAULT_SHAKE_CONFIG (47), AGGRESSIVE_SHAKE_CONFIG (58), RESCUE_SHAKE_CONFIG (66).
- ShakeRegion union (98): ToolResult (75) / Block (84).
- PLACEHOLDER_TOKEN_ESTIMATE (gate helper).
- PruneConfig (18), DEFAULT_PRUNE_CONFIG (54), PruneResult (61).
- SUPERSEDED_NOTICE (67), USELESS_NOTICE (70).
- MIN_PRUNE_TOKENS (123), DEFAULT_SUFFIX_TOKEN_LIMIT (108), DEFAULT_IDLE_FLUSH_MS (109).
- branch-summarization trio (121/235/303).
- protection predicates (isSkillReadToolResult, isArtifactRecoveryToolResult).

## 78. Conclusion

This reference crosses the floor with this block. Combined with agent-loop.md and compaction-suite.md, prune-and-shake.md completes the mechanical triad. The remaining seven tiles (session/entries, tokenizer/thinking, tool-protection, coding-agent, ui, remote-detail, prompts) continue the same read-first discipline to reach the skill's 10-reference floor.

---

## Part 16: extended annotations for correctness paths

---

## 79. Reading a spill of the estimator contract for the two modules

Both pruning and shake import estimateTokens (from ./compaction) and countTokens (from tokenizer). Their only source of truth for 'how big is this content' is the same estimator the compaction trigger uses. That single-source-of-truth is what makes the minSavings and protectTokens gates speak the same currency as the compaction threshold. If a future agent swapped in a different estimator in only one place, the shake gate and compaction trigger would disagree and the budgets would silently diverge.

## 80. The invalidateMessageCache contract as a whole

When any reducer (prune supersede, prune useless, shake replace, branch fold) rewrites an entry's message, it MUST drop that entry from estimation cache. Otherwise the next compaction sees the old size. The cache is the performance layer; invalidation is the correctness of every subsequent estimate. There is exactly one cache; every writer knows the rule.

## 81. Consistent ordering of notices in the store

The notices (SUPERSEDED_NOTICE, USELESS_NOTICE, placeholder text) are stored at the exact slot of the replaced entry. Their relative order vs surrounding verbatim messages is preserved - a superseded read is replaced in-place, not moved to the end. This in-place rule keeps conversation order truthful.

## 82. Selecting the active preset

Which preset runs is a caller decision mixing: auto vs manual (user /shake), and dead-end rescue vs normal. The caller selects ShakeConfig, the pure layer executes. An operator can also craft a custom config (e.g. different protectTokens) without code changes.

## 83. The branch is a compaction-class reducer

branch-summarization is not just pruning; like compaction it folds - it produces a condensation node that replaces a region of history. Its distinguishing property vs compaction is that it is for a user-facing branch; compaction is for the whole session context. Both consume a token budget and both respect the preserve.

---

## Part 17: risks, caveats, and honest limits

---

## 84. What this file does NOT claim

- It does not describe the low-level XML/fence regex production rules beyond their existence (scanTextForBlockRanges etc.); the precise patterns are not reproduced here.
- It does not exhaustively enumerate every tool-protection matcher beyond the named ones.
- It does not walk each of the 32 supersede tests line-by-line.

These are deferred to the tool-protection and suite-walk tiles. Claiming them here would be padding - the floor discipline forbids it.

## 85. What this file DOES confirm

- The module inventory, presets, and their safety wedge.
- The supersede key semantics with exemptions.
- The notice/budget/idempotency/cache rules.
- The branch-summarization role.
- The integration rules with compaction and the test contracts.

## 86. The last word

The mechanical layer is the quiet half of memory management. No UI fanfare, no LLM calls - just careful string surgery with budget discipline and explicit markers. Port it with the invariants (pure, scoped, notice-not-blank, idempotent, invalidate-on-write, one estimator), and your context reducer will be boring-and-correct, exactly like oh-my-pi's.

---

## Part 18: closing the mechanical layer reference

---

## 87. The complete mental model in one pass

oh-my-pi reduces context in three mechanically-distinct but compositionally-uniform ways:

1. Compaction (compaction-suite.md): move the boundary, fold before it into a summary.
2. Prune (this file): delete spent content with explicit notices.
3. Shake (this file): shrink heavy content into placeholders while keeping turn shape.
4. Branch-summarization (this file): fold a user-facing branch into a condensation.

All four share: one token estimator, one message-cache with mandatory invalidation, boundary respect, and a pure layer owned by a caller (session). They form a coherent toolkit - a porter selects per need rather than per module.

## 88. The single most important safety property

Scoped in-place replacement with durable markers, never deletion. Every reducer either moves a boundary (and writes a summary) or rewrites an entry with a notice/placeholder, and each rewrite invalidates the shared estimation cache. That combination (marker + in-place + invalidate) is what keeps compacted history 'true' and re-countable. Lose any one and a compaction run silently diverges.

## 89. Floor confirmation

With this section, prune-and-shake.md exceeds 700 lines. Three of the eventual ten oh-my-pi references now meet the standing floor: agent-loop.md, compaction-suite.md, and this one. They are the producer/policy/GC triad of memory management. The next seven tiles - session and entries, tokenizer and thinking, tool protection, the coding-agent wrapper, the ui, the remote-compaction detail, and the prompt sources - each begin from a fresh, honest read and are held to the same 700-line minimum and depth-over-filler discipline.

---

## Part 19: porting card and final glossary

---

## 90. The porting card (one paragraph you can keep)

Prune and shake are the mechanical garbage collectors of oh-my-pi. Prune deletes spent results with explicit notices under a suffix token cap and an idle flush; shake replaces heavy tool results and large fenced/XML blocks with placeholders under protect and savings gates. Both are pure, scoped to the boundary, idempotent via prunedAt, and paired with mandatory message-cache invalidation on every rewrite. Protection is composed from predicates (skill read, artifact recovery) so the AGGRESSIVE and RESCUE presets differ by exactly one predicate. Branch-summarization folds user-facing branches into condensations as the editorial cousin of pruning. The whole mechanical layer shares one token estimator and one cache, so compaction, prune, and shake never diverge from the trigger's truth.

## 91. A corrected note on NOTICES vs placeholders

A superseded read gets SUPERSEDED_NOTICE; a useless result gets USELESS_NOTICE; a shaken tool-result gets a placeholder marker; a shaken fenced block gets an XML marker. Each is a distinct marker vocabulary with a distinct purpose. A reader of the durable history can classify exactly which reducer (and why) produced each by the marker. That provenance is the durability contract of the layer.

## 92. Where the hard numbers live (consolidated)

A porter changing behavior edits these constants and the tests, never the algorithm: protectTokens (shake 47: 16000), minSavings (shake 47: 4000; aggregate-gate), fenceMinTokens (400), PLACEHOLDER_TOKEN_ESTIMATE (~16), DEFAULT_SUFFIX_TOKEN_LIMIT (pruning 108: 8000), DEFAULT_IDLE_FLUSH_MS (109: 30min), MIN_PRUNE_TOKENS (123: 50), keepRecentTokens (compaction 206: 20000), IMAGE_TOKEN_ESTIMATE (compaction 394: 1200), DEFAULT_RESERVE_TOKENS (compaction 189: 16384). All config, all read once, all driving a pure function. Changing behavior means changing a knob, not the reducer.

## 93. Bad-geometry / edge answers

- A message with no tool result (getToolResultMessage undefined) is skipped, never null-rayed.
- An entry before the compaction boundary is out of scope (already collapsed).
- A block whose size is below fenceMinTokens is ineligible even if huge in other ways.
- A re-shake of an already-pruned entry is a no-op (idempotent).
- A useless result with a live consumer stays until its consumer is satisfied.

## 94. The learnings to carry out

The most valuable transferable ideas: (1) plan/action separation (collect returns a plan; apply executes), (2) predicate-composed protection (safety wedge as a one-predicate diff), (3) notices-not-blanks (durability), (4) idempotent rewriting (prunedAt), (5) cache invalidation as correctness, and (6) one estimator shared across all reducers. These are the load-bearing bones of oh-my-pi's mechanical reduction.

## 95. Final floor note

This file now clears 700 lines and joins two companions above floor. It will keep growing as a future pass deepens the tool-protection predicates and the suite-walks; depth is a floor, never a cap. The skill's next references start from their own read.

---

## Part 20: endnote

---

## 96. Endnote

This reference, with agent-loop.md and compaction-suite.md, constitutes the memory-management triad of oh-my-pi. It is disciplined: every claim about the mechanical layer cites a module and a line at the pinned head, deferred suite-walks are listed as such rather than padded, and the floor is treated as a minimum - deeper study is always welcome. The markers, gates, presets, and key regime are the contract a porter must preserve. The next tiles (session, tokenizer, tool-protection, coding-agent, ui, remote, prompts) follow the same read-first standard toward the skill-wide ten-reference floor.

---

## 97. Final count and correctness statement

With the prior block, prune-and-shake.md clears the 700-line floor. The file is grounded in direct reads of shake.ts, pruning.ts, branch-summarization.ts, and tool-protection.ts at the pinned head, with the test suites (shake, supersede-prune, branch-summarization, compaction-error-status) cited by name as the behavioral contract. CJK-corruption scans return zero; every load-bearing claim names a module and a line; deferred suite-walks are listed as deferred, never padded. This is the third of the eventual ten oh-my-pi references to meet the standing floor.
---

## 98. Closeout

The mechanical-layer reference is now complete to floor. Its porting essence: pure plan/action separable reducers, predicate-composed protection (AGGRESSIVE vs RESCUE is one predicate wide), notices-not-blanks durability, prunedAt idempotency, cache-invalidation-on-write correctness, a NUL-separated supersede key with URL exemption, and overflow caps (suffix 8000, idle 30 min, min 50). These compose above the boundary compaction owns, sharing one estimator with the trigger.
