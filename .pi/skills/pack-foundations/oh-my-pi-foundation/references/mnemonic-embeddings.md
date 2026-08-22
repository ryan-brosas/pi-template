<!-- capsule-v1 -->
# Mnemonic embedding seam — provider chain, cache, heal, and load strategy

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory `oh-my-pi`. **Path:** `packages/mnemopi/src/core/embeddings.ts` + `llm-backends.ts` + `fastembed-runtime.ts`.

## embed() = four-stage provider chain, cache on top
**Path/Symbol:** `packages/mnemopi/src/core/embeddings.ts:embedQuery` / `embed` / `available` / `embeddingDimFor`; `llm-backends.ts` host bridge; `fastembed-runtime.ts` install plan.
**Signature:** `embedQuery(text): Promise<Vector | null>`; `embed(texts): Promise<EmbeddingMatrix | null>`; `available(): Promise<boolean>`; `embeddingDimFor(model): number`; `setLocalModelInitializerForTests`. **Data Shape:** `Vector` = float array; `EmbeddingMatrix` = `Vector[]`; `capInputs` bounds batch size; `queryCache` maps text → vector.

### Decisive source (chain)
```ts
async function embed(texts) {
  if (texts.length === 0 || embeddingsDisabled()) return null;
  texts = capInputs(texts);
  const active = resolveEmbeddingProvider(activeEmbeddingOptions()?.provider);
  if (active != null) try { return await collectMatrix(await active.embed(texts)); } catch { return null; }
  if (providerOverride != null) { /* same guarded path */ }
  if (isApiModel(defaultModel())) return embedApi(texts);
  if (texts.length === 1) { const c = queryCache.get(queryCacheKey(texts[0])); if (c) return [c]; }
  const model = await getLocalModel(); if (model === null) return null;
  /* local encode + matrix */
}
```

**Flow:** active provider wins, then a test/provider override, then API model (`embedApi`), then local flag-embedding. `embedQuery` caches on success and never caches a failed/null result — a transient outage does not poison recall.

## Local model resolution + self-heal (corrupt cache quarantine + sidecar heal)
**Path/Symbol:** `defaultLocalModelInitializer(options): Promise<LocalEmbeddingModel>`; `quarantineCorruptModelFile(message, cacheDir?): Promise<boolean>`; `clearIncompleteModelCache`.

### Decisive source (excerpt)
```ts
const match = /Load model from (.+?\.onnx) failed:.*Protobuf parsing failed/i.exec(message);
if (!match) return false;
const modelFile = resolve(match[1]); const cacheRoot = resolve(cacheDir ?? getFastembedCacheDir());
if (!modelFile.startsWith(cacheRoot + sep)) return false;
await fsp.rename(modelFile, `${modelFile}.corrupt-${Date.now()}`);  // quarantine, then retry once
```

**Flow:** a protobuf parsing error is matched by regex; the offending `.onnx` is only renamed aside if it lives inside the fastembed cache dir (never an arbitrary path); init is retried once; concurrent heal remains safe because a vanished file is a successful quarantine. `defaultLocalModelInitializer` retries once after a sidecar-heal (`ensureFastembedModelSidecars`); anything else rethrows. `clearIncompleteModelCache` wipes the cache when a threshold of files is missing so a full clean re-download happens.

## Remote API route — auth-optional POST, internal retries
**Signature:** `embedApi(texts): Promise<EmbeddingMatrix | null>`.

```ts
const isCustom = !hostMatchesUrl(baseUrl, "openrouter");
const apiKey = embeddingApiKey();
if (!isCustom && !embeddingKeyConfigured(apiKey)) return null;  // openrouter: unconfigured => no API
const body = JSON.stringify({ model: defaultModel(), input: texts });
const headers = { "Content-Type": "application/json", ...getOpenRouterHeaders() };
if (key !== "") headers.Authorization = `Bearer ${key}`;   // empty static key => local/proxy, no header
// withAuth re-resolves on 401 (force-refresh/sibling rotation); fetchWithRetry backs off on 429
```

**Invariant:** every path returns null instead of throwing (the caller degrades, never crashes); cache only ever stores successful embeddings; custom base URLs skip the auth gate.

## Runtime install: exact-pin, no eager download
**Path/Symbol:** `fastembed-runtime.ts:fastembedRuntimeInstallPlan(): FastembedRuntimeInstallPlan`.
**Signature:** `fastembedRuntimeInstallPlan(): { versionKey, install: { dependencies: { fastembed }, trustedDependencies: ["onnxruntime-node"] } }` — versionKey derived from the peerDep spec + `_transitive-ort` so policy changes bust the cache; the fastembed pin is an exact version in `peerDependencies` (not catalog:) so a bundled binary still has a concrete spec; the ORT binding rides along tagged as trusted native addon.

**Probe:** `test/fastembed-runtime.test.ts`, `test/fastembed-model-cache.test.ts`, `test/corrupt-model-quarantine.test.ts`, `test/corrupt-model-retry.test.ts`, `test/embedding-input-cap.test.ts`, `test/degrade-vector.test.ts`, `test/optional-embeddings.test.ts`.

## Host LLM bridge — where extraction falls back to a calling model
**Path/Symbol:** `llm-backends.ts:setHostLlmBackend/getHostLlmBackend/callHostLlm/CallableLlmBackend`.
**Signature:** `setHostLlmBackend(backend: LlmBackend | null): void`; `callHostLlm(prompt, opts): Promise<string | null>`; `CallableLlmBackend(name, fn)` wraps a pure function as a backend.

**Flow:** the host (coding-agent host / plugin) installs exactly one backend; `callHostLlm` returns null when no backend is configured, on throw, or on non-string result. Never injects an LLM dependency into the package graph — the seam is injection-only.

**Probe:** `test/llm-backends.test.ts`, `test/local-llm.test.ts`.

## Retrieve live
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(embed|embedQuery|quarantineCorruptModelFile|clearIncompleteModelCache|fastembedRuntimeInstallPlan|setHostLlmBackend|callHostLlm)$", limit: 12, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.mnemopi.src.core.embeddings.embedApi" });
```