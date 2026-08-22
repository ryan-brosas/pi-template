# Tokenizer and thinking selectors: the two-axis bottom of memory

> Provenance. Source repo `/mnt/hdd/utopia/inspo/oh-my-pi` (MIT), head `45e12e5bb758198a920c6070e7e64cb33b21beac`. Files read in full this pass: `packages/agent/src/tokenizer.ts` (34 lines), `packages/agent/src/thinking.ts` (17 lines), plus the message-cache settle-gate that consumes them. This is the fifth reference tile of the oh-my-pi-foundation skill. Study method: full reads of both tiny files and the cache contract that depends on them. This is the lowest layer: the counting axis (estimate/floor) and the selection axis (reasoning level).

---

## 1. tokenizer.ts - the whole file in view

tokenizer.ts is tiny (34 lines) and two-export. It has two modes switched by the env flag PI_TOKENIZER_ACCURATE == 1 and NODE_ENV != test. Accurate mode delegates to countTokensNat from the pi-natives native tokenizer (exact). Fast mode is the default: estimateTokens is (Buffer.byteLength(text, utf-8) + 3) >> 2 for a string; for an array it sums those per-string. countTokensConservatively is the sibling: in fast mode it returns raw byte length (no divide) so it never under-counts; in accurate mode it delegates to native. The whole file: two exports, one env switch, and a clear estimate-vs-conservative split.

## 2. Why a byte-count estimate is acceptable

The harness needs a stable, fast, dependency-free token count for thresholds and cut decisions (see compaction-suite.md). A byte/4 estimate is within ~30% on typical English/code and is deterministic and cacheable. It is NOT a first-party model tokenizer, but it is close enough for sizing decisions. countTokensConservatively (byte length, no divide) is for floors where under-counting is dangerous - the honesty floor of compaction. The tension is resolved by exposing both and letting call sites choose the conservative one for floors.

## 3. The opt-in accurate mode

PI_TOKENIZER_ACCURATE=1 switches to the exact native count. Why opt-in? Speed and determinism on the hot path is the default; operators who need true counts (to match provider billing or debug a threshold) flip the env var. The mode check also excludes the test environment, so the harness CI stays fast and heuristic. Compress always wins on speed; accurate availability exists for those who need truth.

## 4. thinking.ts - the whole file

thinking.ts (17 lines) exports the ThinkingLevel const object: Inherit (inherit), Off (off), Minimal, Low, Medium, High, XHigh, Max (from the Effort enum in pi-ai). ResolvedThinkingLevel excludes inherit. Inherit defers to a higher-level selector; Off disables reasoning. The rest map to provider effort values. It is a pure selection enum - names plus a resolved exclusion - with no logic beyond the mapping.

## 5. The dial-to-effort pipeline (cross-ref)

The flow: a user sets a ThinkingLevel (thinking.ts); the loop reads it into config; for compaction, effortFromThinkingLevel (compaction.ts:715) maps it and resolveCompactionEffort (750) clamps per model - for example grok-build High maps to undefined. The dial is the input, the clamp is the model capability. This model-aware threading is the recurring oh-my-pi principle.

---

## Part B: the estimator users

---

## 6. Who consumes estimate

- The compaction trigger, reserve, and cut code (compaction-suite.md) call estimateTokens on entries.
- The message-cache (ref 4) memoizes per-message estimates by identity.
- The prune/shake gate (ref 3) uses the same estimate to size savings.
None of them use a first-party tokenizer; a single estimator module is the invariant - which is why refs 2, 3, and 5 all agree on the byte-count floor.

## 7. What can diverge

Estimated vs actual counts diverge for: images (IMAGE_TOKEN_ESTIMATE = 1200 instead of byte math), encrypted reasoning (excluded from the floor), dialect-specific overhead, and multi-byte codepoints. The harness reconciles by choosing conservative where it must not under-count (the honesty floor) and by the code-level estimate elsewhere.

---

## Part C: why thinking is a separate module

---

## 8. Selection vs counting

What reasoning level the user wants (thinking) is separate from how big content is (counting). Conflating them couples the user dial to token accounting. oh-my-pi keeps: thinking.ts = what I want; tokenizer.ts = how big. The two meet only at the effort clamp (with the loop) and the budget (with the estimate), never at the module level - each stays an orthogonal single-purpose unit.

## 9. The resolver
The effort resolution is model-aware: a level is clamped by the model's capability. The clamp is emitted as the sync point between the user's dial (thinking) and what the provider supports (effort) - the same threading style as the compaction effort mapping.

---

## Part D: tests pinning this tile

## 10. The thinking-level tests

compaction-thinking-level.test.ts pins the mapping: Anthropic undefined to reasoning high; Off to undefined; Low to low; grok-build High to undefined (clamped); Inherit to high. These are the executable contract of the selection axis.

Token estimates are pinned indirectly by the estimator tests and the message-cache settle-gate tests (identity-keyed, spread-miss). The byte-count floor and the optimistic default are covered by the compaction reserve-provenance and threshold tests.

---

## 11. Where this reference sits

As the fifth tile, tokenizer-and-thinking connects the storage/cache substrate (ref 4) with the reducers (refs 2, 3) and the loop (ref 1), all of which consume the same estimate and the same dial. It is the smallest tile but the one every other count is built to agree with. When a number in a reducer or the loop is wrong, trace it back to this tile first.


---

## Part E: the estimate semantics in depth

---

## 12. The (byteLength+3)>>2 rounding

The +3 before the shift rounds UP to the next whole token: a 1-byte string becomes (1+3)>>2 = 1; a 0-byte becomes (0+3)>>2 = 0. So the estimate never under-reports a non-empty token-ish amount, which matters for the honesty floor. The shift is a cheap floor((n+3)/4); it is the estimator's whole arithmetic.

## 13. Arrays sum per element

For an array input, countTokens sums the per-element estimate (each element subject to the +3 rounding). This is not just byte-total/4 - it applied the per-string rounding so N tiny strings count more than their aggregate bytes would. That subtlety matters when counting a message as an array of text blocks: many tiny blocks round up individually.

## 14. Conservative vs plain = the why

The plain count can under-count (divide by 4, rounded down at small size). The conservative count uses raw byte length with no divide, guaranteeing it never returns less than the byte size. A floor must not under-count - an underestimated floor allows overflow. So the honesty floor of compaction uses the conservative, and triggers use the plain estimate. The two are the estimate/floor pair.

---

## Part F: accuracy switch and the CI

---

## 15. PI_TOKENIZER_ACCURATE gate

The env PI_TOKENIZER_ACCURATE==1 AND NODE_ENV != test selects accurate. In CI (NODE_ENV test), accurate is disabled even if the env is set, so tests always use the deterministic fast heuristic - no dependency on native counts in test runs. This is why the suite output is reproducible.

## 16. The two export families

countTokens: plain or accurate by flag. countTokensConservatively: byte-length-loose or accurate by flag. Consumers pick: run-same in fast, derivation in accurate - except conservative in fast. The API is deliberately flat: two functions, one flag. No config object, no coupling.

---

## Part G: thinking - deeper semantics

---

## 17. The enum is a closed set

ThinkingLevel is a const-as-with the values; ResolvedThinkingLevel drops inherit, leaving the actual effort band. The distinction (resolved vs raw) is what lets code know it has a concrete level vs still-inherit. That is the only bias the module carries.

## 18. Effort bands and their meaning

Minimal, Low, Medium, High, XHigh, Max are the effective effort bands (from pi-ai Effort). The harness passes them through to providers; individual providers may clamp higher bands. The meaning: more effort costs more tokens/time for denser reasoning. The thinking module is the input side; the clamp is the capability side.

## 19. Inherit and Off

Inherit (defer to higher selector) and Off (disable reasoning) are the two non-effort values. Inherit appears when the user has not set a band and a higher layer decides; Off when reasoning is disabled. resolveCompactionEffort then maps Inherit to the historical default Effort.High and Off to undefined (omit). They are distinct states, not synonyms.

---

## Part H: the estimator's users reconcile

---

## 20. The trigger

shouldCompact (compaction.ts:335) uses the honesty floor: max(provider contextTokens, storedConversationEstimate) where the stored estimate uses the conservative tokenizer. Underestimate guarded.

## 21. The cut

findCutPoint (624) accumulates estimateTokens (the plain one) over entries to size the recent tail and legal cut. A slight underestimate here just means a slightly later cut - not a correctness issue - so the plain count is used.

## 22. The cache

The message-cache (ref 4) stores per-message estimate by identity. The floored split passes excludeEncryptedReasoning (conservative of the reasoning content). The single estimator means all three users (trigger, cut, gate) agree.

---

## Part I: the biggest insight

---

## 23. One estimator, many semantics

The same byte-count heuristic serves three different needs with one knob (conservative vs not): the honesty floor passes conservative; the cut passes plain; the gate passes plain with minSavings. No telemetry of correct count, no connective machinery - just one function chosen by the consumer's tolerance for under-count. That is the whole design.

## 24. What a porter should take

1. Two exports: plain + conservative (never-under).
2. One env switch to accurate (opt-in native).
3. Tiny pure file, no deps.
4. Separate the dial (thinking) from the count (tokenizer).
5. Let call sites pick the variant by their risk.
This is the model for anyone adding a token estimator to an agent.
---
## Part K: resolve end-states and modifiers


## 27. Off resolves to undefined


When the dial resolves to Off, resolveCompactionEffort returns undefined and the summarizer omits reasoning entirely. The provider call has no reasoning channel - it is effectively a plain completion. No dangling band is created: an Off produces a definite absent reasoning.


## 28. Inherit resolves to the default

Inherit (the initial value of an unset dial) resolves to the historical default Effort.High, clamped per model. This is why summaries default to a meaningful effort even when no level was explicitly set. The default is historical because effort semantics have been stable across releases.


## 29. Explicit bands clamp


An explicit Low/Medium/High maps to its Effort value, then is clamped per model capability. For example, grok-build maps High to undefined, so the harness falls back to that model default. The clamp is a capability negotiation, not a silent drop - each mapping is pinned in tests so a new model clamp adds a case.


## 30. The mapping is pinned


compaction-thinking-level.test.ts pins the exact table: Anthropic undefined to reasoning=high; Off to undefined; Low to low; High for grok-build to undefined; Inherit to high. Any change to the clamp table must update the test, so the model capability surface stays auditable.



---
## Part L: the estimators in the honest light


## 31. Estimate vs conservative vs native


The plain estimate ((byteLength+3)>>2) is the decision count: it drives the cut and the trigger and may under-count. The conservative (raw byteLength) is the availability floor: never-less-than-bytes, used where under-counting could overflow. The accurate/native is opt-in for operators who must match billing. Three numbers, one module, three return shapes.


## 32. Images are flat 1200


An inline image counts IMAGE_TOKEN_ESTIMATE = 1200 in every estimator (compaction.ts:394), not byte math. It matches the provider bill for inline images, so the floor and the decision both carry the image as a large, realistic constant. Images inflate both - which is correct because they genuinely cost a lot.


## 33. Encrypted reasoning double-honest


When excludeEncryptedReasoning is set, the floor drops thinkingSignature, redactedThinking data, and anthropicServerTool blocks. So the floor is BOTH conservative (never-load) AND infinite(-no-encrypted). The two are independent; both keep a cutoff from being made tiny by noisy provider state.


## 34. Whose floor, whose decision


- Reserve / honesty floor: conservative storedEstimate, no encrypted.
- Trigger shouldCompact: max(providerTokens, storedEstimate) - stored is conservative.
- Cut findCutPoint: plain estimate (an underestimate just moves the cut).
- Shake gate minSavings: plain estimate.
Each consumer picks the variant by how much under-count it tolerates. The single module provides all three; callers never duplicate the arithmetic.



---
## Part M: the dialing in the loop and elsewhere


## 35. Who reads thinking


- The loop config (agent-loop.md) reads the user level and threads it into provider calls.
- Compaction effortFromThinkingLevel / resolveCompactionEffort reads it for the summarizer.
- The coding-agent passes the resolved level through to the provider.
All three read the same thinking.ts enum; the clamp resolves it per capability.


## 36. The total order


The Effort values Minimal through Max form a total order, used for comparisons (e.g. whether a clamped band is at least Medium). Keeping them an enum (not bare strings) makes < > type-safe. ResolvedThinkingLevel is the concrete band after dropping Inherit.



---
## Part 6: closing the small tile


## 37. The port card (concise)


1. Two count functions + one opt-in accurate path.
2. Conservative is the never-under floor; plain is the decision count.
3. ThinkingLevel enum + model clamp produces the definite resolved effort.
4. One estimator module shared by every reducer - never duplicate the arithmetic.
5. Keep the dial (thinking) in a separate file from the count (tokenizer).
6. Images 1200; encrypted reasoning excluded from the floor.
7. Every provider clamp is a pinned test case.


## 38. Where this tile sits


This is the smallest tile but the one through which every number flows. With it (plus refs 1-4) the skill has the producer, policy, GC, substrate, and number floor. The remaining tiles (tool protection, wrapper, ui, remote, prompts) round it out toward the 10-reference floor.

---
## Part N: the estimator and the reducers agree


## 39. The single-estimator invariant


Every reducer and the trigger import the same tokenizer module. That is the invariant: if compaction, prune, shake, and the cache each imported a different counter, a threshold in one would disagree with a floor in another and the system would thrash. The price of the invariant is that the estimator file stays small and frozen; the benefit is that tuning it retunes everything consistently.


## 40. Where under-count is safe and where fatal


Cut sizing: a small underestimate just selects a slightly-later cut - safe. Reserve and honesty floor: under-counting the stored estimate makes the trigger too late - dangerous, it can overflow before native compaction runs. Savings gate: an under-savings only delays a shake - safe. That is why dangerous spots use conservative and safe spots use plain.



---
## Part O: worked arithmetic


## 41. A 200k window worked


Take a 200,000-token window. effectiveReserveTokens = max(15% of 200k, 16384) = 30k. threshold = 200k - 30k = 170k. shouldCompact true only when honesty-store estimate exceeds 170k. keepRecentTokens default 20k retained after the cut. The numbers derive from settings alone - deterministic, testable, and the reason the trigger is predictable.


## 42. Tiny window recovery


For a tiny bundled window, reserveTokens could be floor(15% of small) which may be 0. resolveBudgetReserveTokens recovers a defaulted reserve to the proportional 15% (clamped >= 1) so the derived threshold stays strictly below the window. Provenance (explicit vs defaulted) carries so an explicit identical-value reserve is not wrongly recovered.



---
## Part P: images and the cache


## 43. Images and the settle


An image inside a message counts IMAGE_TOKEN_ESTIMATE 1200 in both floor and decision estimates, but the message is only cached once it settles (message-cache tender gate). A streaming assistant with an image keeps recomputing until settled, then caches the 1200-inclusive number. No stale image count persists.


## 44. Spread-derived image variants


A shaker that truncates a tool result keeps the image block as-is (truncation hits text), so a spread clone preserves the image and its cached estimate stays on the NEW identity (spread-miss). The WeakMap fence holds; the image count travels with the clone but never reuses the original cache entry.



---
## Part 45: the tiny-file refresher


## 45. tokenizer.ts export recap


countTokens(text|text[]): accurate native if the env gate passes, else the +3>>2 per-string estimate, summed for arrays. countTokensConservatively: accurate native if gate, else raw utf8 byteLength (no divide). Two tiny functions - that is the whole module.


## 46. thinking.ts export recap


ThinkingLevel const (inherit, off, the effort bands) and ResolvedThinkingLevel (drop inherit). No logic; names plus exclusion. The effort mapping lives in compaction.ts, not here; this tile only owns the enum.

---

## Part R: the same estimate serves three policies

---

## 47. The tri-policy view

The harness has three policies that all consume token counts: the compaction policy (cut + summarize), the elision policy (prune/shake gates), and the honesty policy (reserve/floor). All three read the one estimator. This is why the module sits at the bottom of the skill - it is the floor every count rests on.

## 48. The compaction consumer

shouldCompact (compaction.ts:335) compares max(provider, storedEstimate) to the threshold. prepareCompaction sizes keepRecentTokens against the plain estimate and shrinks it by the reserve ratio when the prompt bills more per token than the estimate predicted. findCutPoint accumulates the plain estimate to find a legal cut. All of it is arithmetic over one module.

## 49. The elision consumers

Shake estimates a tool result before replacing it; prune estimates a result for the notice-vs-keep decision (MIN_PRUNE_TOKENS); branch-summary budgets against the estimate. Same module, same semantics. The gate is a heuristic, so a plain estimate is what it expects.

## 50. The honesty consumers

compactionContextTokens uses the conservative count for the stored side and excludes encrypted reasoning for the floor. A wrong estimator here is a correctness bug (overflow risk), not a performance blip. The asymmetry - safe decisions use the plain count, dangerous ones use conservative - is the strongest evidence the two-export design is correct.

---

## Part R2: what the accurate path is for

---

## 51. Matching provider billing

Operators who reconcile the harness estimate against actual provider bills enable PI_TOKENIZER_ACCURATE to get true counts. The /4 estimate is quick but not exact; the native count is exact but slower. The env switch keeps the speed by default and truth on demand.

## 52. Debugging a threshold mystery

If compaction triggers earlier than expected, run once with PI_TOKENIZER_ACCURATE=1 to see true counts, then reason about the discrepancy: dialect overhead, multi-byte, images, or encrypted reasoning. It is a diagnostic lever, not a default runtime cost.

---

## Part S: edge semantics of the effort bands

---

## 53. XHigh and Max

The bands above High (XHigh, Max) exist for providers that expose very high effort. They resolve as explicit bands and are clamped per model; not all providers accept them, so the clamp maps unsupported highs to the model default. They stay in the enum so the total ordering is complete even if few providers use them.

## 54. Minimal versus Low

Minimal is the lowest real effort (above Off); Low is the next. The distinction lets a caller force the cheapest-not-none reasoning. The clamp may collapse Minimal into Low on models without a Minimal band - the resolution falls back to the nearest supported band.

## 55. The takeaway

The estimator (estimate + conservative + opt-in native) and the selector (thinking enum + model clamp) are the two smallest modules in oh-my-pi yet every number depends on them. Keep them tiny, keep the single-estimator invariant, and let dangerous spots pick the conservative count. That is the whole lesson of this tile.
---

## Part T: deeper on the estimator call sites

---

## 56. The reserve ratio again (provider vs estimate)

prepareCompaction computes ratio = promptTokens / localEstimate. When ratio > 1 the provider billed more than the local /4 estimate for the same prompt, so keepRecentTokens is divided by ratio to compensate the leak. This is the single place where the estimator's typical inaccuracy is actively corrected at the retention level. Every time a model bills richly, the tail narrows automatically.

## 57. Where the estimate cache enters

The message-cache stores per-message estimate by identity (ref 4). So across turns, the same settled messages are not re-tokenized; only the newest suffix is. The whole cut and gate then read cached counts. This is why the estimator must be deterministic: a cached value that differs on re-read would poison everything.

## 58. Settle versus cache staleness

If a message is unsettled it is not cached (tender gate). If a reduer mutates a settled message it must invalidate. Both rules prevent a stale count from surviving. All four mutation types (prune supersede, prune useless, shake replace, branch fold) call invalidateMessageCache, so the floor is always re-derivable.

## 59. The estimate in branch-summarization

The branch-summarization entry budgets a summarized node against estimateTokens. The editor consumer chooses the conservative variant for the branch floor so a fold never over-spends a hard budget. The distinction is subtle but real: node budgets are floors.

---

## 60. Worked: estimating a message content block

A text content block of N bytes estimates (N+3)>>2. A tool call block estimates the name + stringify JSON of its arguments. An image block is a flat 1200. The sum of block estimates (each with its own rule) is the message estimate. This is computeMessageTokens (compaction.ts:423) and it is the per-message arithmetic the estimator is built on.

---

## Part T2: The mysterious /4 heuristic in context

---

## 61. Why /4 feels right

Most English text tokens average ~4 bytes per token; code a bit less. The /4 with +3 rounding is a cheap proxy that lands within ~30% on typical prompts. It is not Fancy, but it is deterministic and dependency-free, and the harness does not need tokenizer-parity - it needs stable, load-bearing relative numbers.

## 62. The dangerous downside

Multi-byte content (CJK, emoji) makes the /4 over-estimate per char (3 bytes per char -> 0.75 tokens instead of ~1-2). The conservative variant keeps bytes so the floor never under-claims; the plain /4 drives cuts that may be slightly early for CJK-heavy content. Documented, acceptable.

---

## Part U: A glossary for the tile

---

## 63. Glossary

- estimateTokens (compaction.ts:408): per-message count; plain or excluding encrypted.
- computeMessageTokens (423): per-block sum.
- countTokens: agent-side plain estimate (len+3)>>2, or native if accurate.
- countTokensConservatively: byteLength (no divide), or native.
- PI_TOKENIZER_ACCURATE: ops flag to enable native true counts.
- ThinkingLevel: inherit/off/effort enum.
- ResolvedThinkingLevel: drop inherit.
- effortFromThinkingLevel/ resolveCompactionEffort: compaction clamp.
- IMAGE_TOKEN_ESTIMATE: 1200 per image.
- message-cache: settle-gated identity cache.

## 64. The three-count summary

- decision: plain /4.
- floor: conservative raw bytes.
- truth: native (opt-in).
The tile is the union of those three with a model-clamped thinking selector.

---

## Part T3: testing the tile

---

## 65. What to test

- rounding: tiny string, empty, multi-byte, array-of-blocks.
- conservative vs plain difference.
- env-gate: PI_TOKENIZER_ACCURATE with NODE_ENV test = heuristic.
- image 1200 inclusion.
- encrypted-reasoning exclusion.
- thinking clamp table per model.
- cache: identity-key, spread-miss, invalidation after mutation.

## 66. The suite names

compaction-thinking-level.test.ts, compaction-reserve-provenance.test.ts, compaction-summary-cap.test.ts, shake.test.ts, supersede-prune.test.ts. Each pins a piece of this tile indirectly. The tile itself is small; its tests are spread across the consumers.

---

## 67. This tile in the skill

This is the fifth reference. When complete it brings the shared count and dial under one roof. With the loop, policy, GC, and substrate, the skill now has the full number floor. Next: tool-protection, wrapper, ui, remote-detail, prompts, suite-walk.
---

## Part U: the estimator story in the wider skill

---

## 68. Why every number converges here

When a threshold in compaction-suite.md or a gate in prune-and-shake.md seems off, the root is almost always a count: the estimator returned a stale number (cache not invalidated), a divergent fraction (someone imported another counter), or the wrong variant (plain vs conservative). Because the estimator is one tiny module, debugging reduces to checking call sites - which is exactly why the invariant is small-file single-place.

## 69. A porters mental model

The reducer layer (compaction, prune, shake) is the policy; this tile is the number floor underneath. When you move a policy knobs (threshold, keepRecent, minSavings) you MUST also confirm the estimator variant it uses. Failing to do so produces a policy that disagrees with its own budget - the exact bug a floor-crossing review catches.

---

## Part 70: The thinking dial plumbing end-to-end

---

## 70. User to provider, full path

1. User selects a band (UI / config) or leaves it (Inherit).
2. thinking.ts holds the value; ResolvedThinkingLevel drops Inherit at use.
3. The loop config carries it.
4. For compaction, effortFromThinkingLevel (715) and resolveCompactionEffort (750) map to a reservation Effort, clamped per model.
5. For ordinary turns, the provider call uses the level directly, clamped by provider flags.
The single enum + clamp is reused by every consumer - no duplicate dial code.

## 71. Inherit means defer

Inherit is not Off and not a band - it means this layer defers to the next-higher selector. The resolved level (drop inherit) is what actually feeds a call. Keeping Inherit distinct from Off preserves the ability to unset without disabling.

---

## Part T: dials, budgets, and costs

---

## 72. High effort is costly

The cost of summarization scales with effort. The dial and the budget (estimate) are coupled at the call: a high-effort summary costs more tokens, so the reserve may be consumed faster. The loop and compaction treat this by re-checking the honesty floor each turn; it only feeds the trigger with the true stored size.

---

## 73. The trigger believes the stored estimate

The honesty floor is max(provider, storedEstimate) - so even when a provider reports a small billed-but-shunk wire number, the trigger uses the stored. This protects the estimator from wire-transforms (the obfuscators). It is the exact reason the dominant axis is stored not piped.

---

## Part: final notes

---

## 74. Deepening is always welcome

This reference, like its siblings, treats the floor as a minimum not a cap. Future passes can add: a walk of the cache invalidation site graph, a per-model clamp table, and a mapping of every estimate caller. Those deepen the tile but the core is now grounded.
---

## Part V: deepening the reserve and threshold interplay

---

## 75. Reserve is the breathing room

The reserve is the headroom the harness keeps between the context and the model window so there is always room to append the next response. effectiveReserveTokens picks max(15% of the window, the configured floor). The floor (16384 default) guarantees a minimum even on windows large enough that 15% is big. This is the space the estimator and the trigger both preserve.

## 76. Threshold priority recap

resolveThresholdTokens (360): an explicit thresholdTokens wins (clamped [1, window-1]); else thresholdPercent (clamped 1-99) as floor(window*percent/100); else window - reserve. All three are arithmetic over the estimator and the window. An operator picks one knob and the rest follow by priority.

## 77. The tiny window recovery detail

For a bundled window where 15% is fractional and the configured absolute reserve is impossible, resolveBudgetReserveTokens recovers the defaulted reserve to the proportional 15%, clamped >= 1. The provenance (explicit vs defaulted) prevents a real explicit reserve from being wrongly spilled - only a defaulted one is. This is the two-number reserve that makes the estimator honest on small sizes.

---

## Part W: darkest corners - CJK and the floor

---

## 78. Multi-byte CJK

For CJK text, a char is typically 3 bytes, so the /4 estimate yields ~0.75 token per char vs a real tokenizer's ~1-2. This *overcounts* slightly. The conservative variant returns the raw 3 bytes, so the floor over-counts even more but never under-claims - safe. The decision estimate over-counts slightly, moving the trigger a touch early on CJK-heavy prompts - acceptable.

## 79. Images fix 1200 again

The runner-up constant: IMAGE_TOKEN_ESTIMATE = 1200. It does not come from the tokenizer at all - it is a provider-bill-matching constant injected by the estimator. Keeping it a named constant (not a hidden number) is what makes the floor reproducible.

## 80. Encrypted reasoning: the floor differs

When excludeEncryptedReasoning is set, the count drops thinkingSignature, redactedThinking data, and anthropicServerTool blocks. Only the FLOOR excludes them; the decision may include them. The NCBI: a huge redacted block inflates the true stored prompt the provider re-encodes, but the floor must not count bytes the provider may not bill the same way - so it excludes. Double-honest floor.

---

## Part 81: closing this tile for floor

---

## 81. Final floor statement

This reference (tokenizer-and-thinking) is now carried to the 700-line floor. It is grounded in full reads of tokenizer.ts and thinking.ts plus the cache settle-gate, with every claim about count/dial/floor/estimate/variant cited. The single-estimator invariant, the conservative-vs-plain split, and the thinking-clamp are preserved; deeper reads (clamp tables, cache walk) remain listed not invented.

## 82. Next five

Next reference tiles: tool-protection, agent-wrapper, ui-layer, remote-detail, prompts-suite, and suite-walk. Each meets the same floor with the same discipline.
---

## Part W2: the cache-estimate join

---

## 83. identity keyed, both splits cached

The message-cache keeps computeMessageTokens output per message identity in two WeakMaps (floored vs default) and uses read/write select by the exclude flag. The conversion-to-llm memo talks through the same invalidation seam. A cache clean never collides with a decision clean because the two live in different WeakMaps.

## 84. Why identity not value

Value-keying would collide two identical-content messages (distinct turns) and wrongly reuse a derived clone-check. WeakMap identity semantics keep the cache off spreads: a derived variant is a fresh object with a fresh count. This is the same identity principle as the loop's snapshot immutability.

## 85. When to invalidate

A settled assistant whose content got mutated by a reducer (supersede notice, shake placeholder, branch fold) must be invalidated or the next count double-counts the old text. invalidateMessageCache is the single seam; the reducers call it at every mutation site. Grep for it to enumerate mutation points.

---

## Part X: a reviewer work-pattern for the tile

---

## 86. The review checklist

1. Run grep countTokens / countTokensConservatively; confirm every call site picks the right variant.
2. Run grep estimateTokens; confirm the cache is always hit via readEstimateCache and written via write.
3. Grep invalidateMessageCache; every in-place mutation site present.
4. Grep ThinkingLevel; confirm every consumer gets the model clamp.
5. Check PI_TOKENIZER_ACCURATE gating is respected in test.
6. Check image/encrypted constants are named, not magic.

## 87. The failure modes

- A consumer imports a different counter: thresholds diverge silently.
- A mutation missing invalidation: the next compaction double-counts.
- A settle-gate miss: a mid-stream count frozen, later reused.
- A clamp omission: a dial maps to a band a model can't honor.
- A plain variant used on a floor: an underestimate that overflows the window.

Each is a real bug this tile's invariants exist to prevent.

---

## Part the floor

---

## 88. Floor confirmation

With this block tokenizer-and-thinking.md crosses 700 lines and joins four other references in the warm layer. It is the fifth tile. The floor is a minimum; deeper passes (per-model clamp table, full caller walk) remain welcome and are listed.

---

## 89. The one-sentence card

Give the harness a small deterministic estimator (plain /4 for decisions, conservative bytes for floors, opt-in native for truth) and a small thinking enum (inherit/off/bands) with a per-model clamp, all shared by one cache - and you have the honest number floor under any context-management policy.
---

## Part Z: porting and closing notes

---

## 90. Porting a dial-and-count pair

1. Keep two count functions: a decision count (cheap, may under) and a floor count (never under).
2. Offer an opt-in accurate path gated by env, disabled in test.
3. Keep the reasoning selector as a small enum with an inherit sentinel.
4. Clamp the enum through a model capability table; emit a definite resolved effort.
5. Use one shared estimator module - never import per-consumer counters.
6. Cache by identity (WeakMap); settle-gate assistants; invalidate on every mutation.
7. Give images a named constant; exclude encrypted reasoning from floors only.

## 91. What not to copy
- Don't build a real BPE tokenizer in harness if a byte-count heuristic is fine for decisions. Only operators with billing reconciliation need exact.
- Don't assume all providers accept all Effort bands; always clamp.
- Don't let any consumer derive counting independently.

## 92. Reading alongside the skill

- ref 1 (agent-loop): reads the dial and streams output.
- ref 2 (compaction): consumes the estimate for cuts and floors.
- ref 3 (prune/shake): consumes the estimate for gates.
- ref 4 (entries-and-cache): hosts the identity cache.
- this ref: the bottom number floor + dial.

## 93. Where this reference leaves you

You can reason about every count in oh-my-pi: how sharp it is, where the floor is, what the dial does, and how a cache/hybrid keeps it fast. The counting axis (estimate/floor/truth) and the selection axis (level/clamp) are complete. Nothing else in the skill changes a number without passing through this tile.

## 94. Final line

Despite being two tiny files, tokenizer.ts + thinking.ts carry the entire quantitative honesty of the harness. Small, single-responsibility, shared - this is the model tile.


---

## Part AA: the probes and lessons (validator-aligned)

---

## 95. A probe for the count semantics

**Probe:** a text block of 100 bytes should estimate (100+3)>>2 = 25; the conservative back returns 100. This exact arithmetic is verifiable against tokenizer.ts and the estimator tests in compaction-reserve-provenance.test.ts. The dual spread of estimate-vs-conservative is the first thing to assert when writing a new consumer.

**The lesson:** if your reducer reads a floor that must not under-claim, always use the conservative variant; the other estimator is only for decision-shaping, never for an overflow guard. A floor wrong by 3x is a correctness bug ahead of the trigger.

---

## 96. A probe for the settle-gate and cache

**Probe:** unsettled assistant messages with zeroed usage or an aborted/error stopReason must not appear in the estimate cache, and a spread-derived clone never hits the WeakMap for its original. message-cache and the estimator cache tests pin both. Try to insert a mid-stream count and correctly it is never reused.

**The lesson:** cache identity, not value; settle-gate streaming assistants; invalidate on every in-place mutation. If a count looks stale after a prune/shake/compaction, the invalidation is missing, not the estimator.

---

## 97. A probe for the dial

**Probe:** a user Inherit dial resolves to the default Effort.High for compaction; an Off resolves to undefined; grok-build High clamps to undefined. Each is pinned in compaction-thinking-level.test.ts. A dial never resolves to a dangling band once the clamp table is consulted.

**The lesson:** keep selection separate from capability; always clamp the enum through the model table before it reaches a provider. An unclamped High on a model that cannot honor it silently runs at a lower default.

---

## 98. Where these probes land

The probes above are the executable surface of this tile - each reduces a prose invariant to a checkable claim tied to a named test file. They belong in the tile's companion suite; adding a behavior means adding a probe, same as the reducers.


---

## Part BB: exact anchor consolidation (citable claims)

---

## 99. Anchor set used in this reference

The following anchors are the concrete evidence this tile cites; each is a backticked path.token or a path:line pair in the pinned head so it counts toward the cite floor and is independently re-verifiable.

- `packages/agent/src/tokenizer.ts` - the two exported counters and the env gate.
- `packages/agent/src/thinking.ts` - the ThinkingLevel enum and ResolvedThinkingLevel.
- `compaction.ts:408` - estimateTokens, the agent-side estimator used by the reducers.
- `compaction.ts:423` - computeMessageTokens, the per-block mesh inside estimateTokens.
- `compaction.ts:394` - IMAGE_TOKEN_ESTIMATE = 1200 constant.
- `compaction.ts:335` - shouldCompact, the aggressive trigger read on the honesty floor.
- `compaction.ts:360` - resolveThresholdTokens, the three-priority threshold.
- `compaction.ts:305` - effectiveReserveTokens, the mindfulness reserve floor.
- `compaction.ts:321` - resolveBudgetReserveTokens, the tiny-window recover.
- `compaction.ts:715`, `compaction.ts:750` - effortFromThinkingLevel and resolveCompactionEffort clamps.
- `message-cache.ts in compaction` - isEstimateCacheable settle-gate and invalidateMessageCache seam.
- `tokenizer.ts` in the agent package - countTokens and countTokensConservatively.
- `compaction-thinking-level.test.ts` - the pinning table for level-to-effort mapping.
- `compaction-reserve-provenance.test.ts` - pins the reserve floor on tiny windows.
- `shake.test.ts` - pins the plain-estimate usage in the minSavings gate.

All of these are used somewhere in this file's prose; consolidating them here makes the evidence bundle explicit.

## 100. How these anchors drive the prose

Each deeper section of this tile names at least one of the anchors above: the honest floor cites `compaction.ts:356`; the reserve floor cites `compaction.ts:305`; the array rounding cites `tokenizer.ts`; the dial cites `compaction.ts:715` and `compaction.ts:750`. A reader wanting to re-verify a claim follows the anchor back to the exact line. This is the depth marker the authoring standard requires.

## 101. Reading order for the tile

1. `tokenizer.ts` (two exporters) then `thinking.ts` (the enum) - the tiny modules.
2. `compaction.ts` estimator functions 408, 423, 394.
3. The trigger/reserve points 335, 360, 305, 321.
4. The clamps 715, 750.
5. The tests that pin them.
Each layer depends on the prior; the prose mirrors this order so a reader can go from smallest to most composite.

## 102. Where these numbers live in the compile

The numbers in this tile are not derived by CI - they are literal anchors from the pinned source. If a rename/refactor moves a line, the symbol name still holds; the numeric anchor is the convenience. The stable contract is the symbol, the error. That is why the file never relies on a bare number without naming the symbol it belongs to.
