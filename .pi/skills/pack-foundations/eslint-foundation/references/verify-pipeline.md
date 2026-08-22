<!-- capsule-v1 -->
# ESLint verify pipeline — normalize config, then suppress-distinguishing verify

**Source:** ESLint MIT `main@dc1e7a84`; Codebase Memory project `eslint`. **Question:** How does a flat-config lint call normalize an arbitrary config, discover files, and report verified messages?

## 1. Linter.verify normalizes any non-FlatConfigArray config
**Path/Symbol:** `lib/linter/linter.js:Linter.verify` (829–868).
**Signature:** `verify(textOrSourceCode, config, filenameOrOptions): LintMessage[]`.
**Data Shape:** string/SourceCode text, flat config (object or array), filename-or-options.

### Decisive source
```js
let configArray = configToUse;
if (!Array.isArray(configToUse) || typeof configToUse.getConfig !== "function") {
  configArray = new FlatConfigArray(configToUse, { basePath: cwd });
  configArray.normalizeSync();
}
return this._distinguishSuppressedMessages(
  this._verifyWithFlatConfigArray(textOrSourceCode, configArray, options, true),
);
```

**Flow:** resolve cwd -> coerce config to a normalized `FlatConfigArray` -> dispatch to the flat verify core -> separate suppressed messages. **Invariant:** an already-normalized array is reused; anything else is rebuilt against the working directory; suppressed messages are distinguished, never dropped.
**Probe:** direct `tests/lib/linter/linter.js` (verify) exercises suppression distinction and config normalization.

## 2. ESLint.lintFiles discovers files, then scales workers
**Path/Symbol:** `lib/eslint/eslint.js:ESLint.lintFiles` (961–1094).
**Signature:** `async lintFiles(patterns): Promise<LintResult[]>`; special-cases empty string/empty array -> `["."]` or `[]` when `passOnNoPatterns`.
**Data Shape:** normalized patterns, concurrency policy, glob-input flag, unmatched-pattern error, `FlatConfigArray`-covering loader.

### Decisive source
```js
const workerCount = module.exports.calculateWorkerCount(this, filePaths);
const results = workerCount
  ? await lintFilesWithMultithreading(this, filePaths, workerCount, this.#optionsOrURL, warnFn)
  : await lintFilesWithoutMultithreading(this, filePaths);
return processLintReport(this, unsuppressedResults);
```

**Flow:** normalize patterns -> find files (glob off uses the loader) -> scale to worker count (or single-thread) -> reconcile cache -> process the report. **Invariant:** worker scaling is a module hook overridable in tests; file discovery is separated from reporting; caching runs after results settle.
**Probe:** direct `tests/lib/eslint/eslint.js` (lintFiles, worker scaling, empty-pattern edge cases): an empty string and an empty array both collapse to `.` unless `passOnNoPatterns` is set.

## 3. Config loader + flat-config validation
**Path/Symbol:** `lib/config/config-loader.js:ConfigLoader.loadConfigArrayForFile` (406–416) and `loadConfigFile` (198–276); `lib/config/flat-config-schema.js:validate` (548–550).
**Signature:** `loadConfigArrayForFile(filePath)`; `validate(config)` throws on an invalid flat config.
**Data Shape:** per-file resolved config arrays, normalized via `FlatConfigArray.normalizeSync`.
**Flow:** file -> loader resolves the matching config array (cached) -> `normalizeSync` merges/inherits; the schema validator rejects malformed rule options before any lint runs. **Invariant:** config validation precedes rule execution; normalization is shared synchronous code.
**Probe:** direct `tests/lib/config/config-loader.js` and `tests/lib/config/flat-config-schema.js`.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.check_index_coverage({ project: "eslint", paths: ["lib/linter/linter.js", "lib/eslint/eslint.js"] });
await mcp.codebase_memory.search_graph({ project: "eslint", name_pattern: "^(Linter|ESLint|lintFiles)$", limit: 6, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "eslint", qualified_name: "eslint.lib.linter.linter.Linter.verify" });
```
