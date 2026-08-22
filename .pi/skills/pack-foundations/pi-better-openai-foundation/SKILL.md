---
name: pi-better-openai-foundation
description: "Use when building a pi/OpenAI extension: layered config resolution with clamping, provider-payload fast-mode injection, Codex OAuth credential resolution, subscription usage snapshot parsing, and diagnostic secret redaction."
disable-model-invocation: true
---
# pi-better-openai: OpenAI Subscription Extension Foundation

## Use this for
Build a pi coding-agent extension that layers project-over-global JSON config with defaults and numeric clamping, injects a provider-payload field (e.g. `service_tier: "priority"`) only when a toggle is active for a supported model, resolves OpenAI Codex OAuth credentials (registry-first, auth-file fallback), parses and formats ChatGPT subscription usage windows, and redacts secrets from diagnostic text and structured values. Source code and direct tests are ground truth; references carry decisive excerpts and graph retrieval. The repo's direct tests are excluded from the index by design (`fast-pattern`), so probes are named from the on-disk test files but the graph coverage caveat is stated in each capsule.

## Load the matching source dump
- `references/config-resolution.md` — layer project/global/default config, normalize model keys, clamp numerics, and write config preserving unknown fields.
- `references/fast-mode-injection.md` — inject a provider payload field only when a toggle is active for a supported model, without mutating the original payload.
- `references/codex-auth.md` — resolve Codex OAuth credentials registry-first with auth-file fallback, expiry check, and JWT account-id extraction.
- `references/usage-snapshot.md` — parse and format ChatGPT subscription usage windows (left-percent, reset countdown/clock, Spark scope fallback).
- `references/diagnostic-redaction.md` — strip ANSI/control chars and redact secret-like fields from diagnostic text and structured values.

## Capsule map
- **Config** — `references/config-resolution.md`: `resolveConfig` merge order (defaults → global → project), model-key normalization, per-field numeric clamping, and non-destructive `writeConfig`.
- **Fast mode** — `references/fast-mode-injection.md`: `FastController` desired-vs-active split, `injectProviderPayload` non-mutating spread, model allow-list gating.
- **Auth** — `references/codex-auth.md`: `getCodexCredentials` registry-first precedence, `readCodexAuth` OAuth/expiry validation, `extractAccountIdFromJwt`/`parseCodexRegistryCredentials` fallbacks.
- **Usage** — `references/usage-snapshot.md`: `parseUsageSnapshot` bucket normalization, `formatUsageSnapshot` countdown/clock, Spark-scope fallback.
- **Redaction** — `references/diagnostic-redaction.md`: `sanitizeDiagnosticError`/`redactDiagnosticValue`/`maskIdentifier` secret scrubbing.

## Extending the foundation
Add one `references/<seam>.md` capsule for one graph-selected, source-confirmed porting question. Add one matching loader line and map entry; keep evidence in the capsule, not this leaf. Each new capsule must carry Path/Symbol, Signature, Data Shape, a labelled decisive source excerpt, Flow, Invariant, a direct-test Probe, and a `search_graph` Retrieve.

## Provenance
pi-better-openai (`@monotykamary/pi-better-openai`, MIT, `main@86814e9047996abba08e4c907e23286329196fe0`); Codebase Memory project `pi-better-openai` (fast index: 847 nodes / 2,729 edges, indexed 2026-08-15). Direct tests are excluded by design (`fast-pattern` skip-list, 19 files); cited source files report `no_recorded_issue` with `freshness: missing` (best-effort — read source to confirm shipped claims).

## Full view (memory graph)
Revalidate `pi-better-openai` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source and direct tests decide shipped claims. The index excludes `tests/` by design (`fast-pattern`), so direct-test probes are named from the on-disk files but are not graph-covered.

## Boundaries
Adopt the layered config resolution + clamping, the non-mutating provider-payload injection, the registry-first Codex credential resolution, the usage snapshot parsing/formatting, and the diagnostic redaction helpers. Adapt the config basename, supported-model list, service-tier value, usage endpoint, and auth file path to the host. Omit the live WebRTC voice stack (`src/live/`), image generation (`src/image.ts`, sharp), web search backend (`src/websearch.ts`), Codex pets spritesheet rendering (`src/pets.ts`), footer layout, the `UsageController` polling lifecycle (tightly coupled to pi's `ExtensionContext` events), and the settings-picker UI in `index.ts` unless a target needs them.
