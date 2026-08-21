# Continue — FIM Autocomplete Pipeline Reference

Complete source-grounded reference for continue's tab-autocomplete engine. Files: `core/autocomplete/CompletionProvider.ts` (316 lines, full), `generation/GeneratorReuseManager.ts` (full), `filtering/streamTransforms/{lineStream.ts head, StreamTransformPipeline}`, `templating/index.ts` (head), plus the LLM base (`core/llm/index.ts`, 1,504 lines).

## The pipeline: eleven stages between keystroke and ghost text

`provideInlineCompletionItems` (:137-280) is the whole story, in order: abort-signal creation → LLM preparation (temperature defaulted to **0.01**, JetBrains model fallback, Mistral empty-key skip) → security-concern filepath rejection → debounce (skippable via `force`) → HelperVars creation → prefiltering → snippet+workspace parallel fetch → token-limited prompt render → **LRU cache lookup keyed on prunedPrefix** → stream with filters → postprocessing → outcome telemetry. Errors that are "expected on occasion even during normal functioning" (Ollama status, aborted operations) are silently ignored — "Not worth disrupting the user to tell them that a single autocomplete request didn't go through."

**Lesson:** autocomplete is a pipeline where EVERY stage can bail to `undefined`; latency comes from caching on pruned prefix and debouncing, correctness from never post-processing an aborted stream.

**Probe:** feed a `.env` filepath via `core/indexing/ignore.ts` (isSecurityConcern) → undefined before any LLM call; same prunedPrefix twice → second hits `core/autocomplete/util/AutocompleteLruCache.ts` (cacheHit flag in outcome).

## Verification

The pipeline stages are covered by vitest suites: `lineStream.vitest.ts` (1,301 lines) over the filter transforms, `filterCodeBlock.vitest.ts` (452 lines), `renderPrompt.vitest.ts` (275 lines) for template binding, `formatOpenedFilesContext.vitest.ts` (435 lines) for snippet formatting, and `AutocompleteLruCache.test.ts` (650 lines) for cache eviction/bounds. `GeneratorReuseManager.vitest.ts` (223 lines) pins the typed-prefix/backspace reuse invariants.

## Generator reuse: the crown jewel

`GeneratorReuseManager` solves the killer UX problem: the user keeps TYPING while the model streams. If `(pendingGeneratorPrefix + pendingCompletion).startsWith(prefix)` — i.e., everything the user typed is already contained in the streamed-so-far completion — the RUNNING generator is reused instead of cancelled:

- Already-typed characters are stripped from yielded chunks by a consume loop comparing char-by-char against `typedSinceLastGenerator`.
- A listenable wrapper accumulates `pendingCompletion` as chunks flow, so future reuse checks see the full text.
- Backspace protection: reuse requires `pendingGeneratorPrefix.length <= prefix.length` ("for e.g. backspace").
- Non-multiline mode breaks at the first newline in a chunk, yielding only up to it.

**Lesson:** for streaming UIs, reuse in-flight generations when the typed prefix remains a prefix of generated+pending text — strip already-typed characters from yields rather than restarting the request per keystroke.

## Stream filtering: teaching the model manners at read time

The filter pipeline (StreamTransformPipeline over lineStream.ts) cleans LLM output AS IT STREAMS, using heuristics mined from thousands of test cases (testCases.ts = 2,200 lines):

- **English-phrase detection**: lines starting with ENGLISH_START_PHRASES ("Sure!", "Here is", …) or ending `:` without code keywords are removed BEFORE the code block starts; ENGLISH_POST_PHRASES ("This code", "Note that") stop the stream after it ends.
- **Markdown fence handling**: ``` lines trigger removal/nesting logic; markdown files get different rules (headerIsMarkdown).
- **Bracket-aware stopping**: isBracketEnding checks whether a line ends mid-bracket so completions don't cut inside a block.
- **validatePatternInLine** (:52-90): a stop-pattern (e.g. a repetition marker) is valid only if not preceded by non-whitespace (identifier guard) and not inside quotes (odd-quote-count heuristic).

**Lesson:** never trust raw FIM output — run a line-level filter pipeline that strips conversational wrappers, respects bracket nesting, and stops at semantic boundaries; encode every heuristic as a test case harvested from real failures.

## FIM templating: per-model templates with token-budget pruning

`renderPromptWithTokenLimit` (templating/index.ts) picks a template per MODEL (`getTemplateForModel`) or uses a user Handlebars override, fills prefix/suffix/filename/reponame/language, and prunes SNIPPETS (not the user's cursor context) when over budget — `pruneLinesFromBottom`/`pruneLinesFromTop` with a token-counting buffer safety margin. Snippets come from a race-free parallel gather (getAllSnippetsWithoutRace): recently edited files, clipboard, LSP definitions.

**Lesson:** FIM prompts need per-model templates (Cohere/StarCoder/Codestral differ wildly), snippet pruning under a token budget that never touches the immediate cursor region, and stop tokens derived from the template's own format.

## Caching + telemetry honesty

AutocompleteLruCache keys on prunedPrefix (the exact string sent as FIM prefix) so identical contexts hit without an LLM call; outcomes record time/cacheHit/model/numLines and feed accept/display logging (JetBrains marks displayed immediately since ghost-text lifecycle differs). BracketMatchingService tracks unbalanced brackets from ACCEPTED completions to auto-close pairs on later edits.
