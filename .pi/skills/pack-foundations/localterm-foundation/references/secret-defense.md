# Localterm — Secret Defense Reference (the crown jewel)

Complete source-grounded reference for the two-layer defense that keeps secrets out of an agent's bash tool. Files: `packages/pi-extension/extensions/bash-secret-scrub.ts` + `src/utils/{redact-output,scrub-env,read-secret-values,read-localterm-secret-policy,read-pi-shell-settings}.ts` + `src/constants.ts` + `tests/redact-output.test.ts`.

## The threat model

localterm's shim injects secrets into **pi's own env only** (values live in the macOS Keychain, never in policy files). But pi's bash tool spawns commands with `{ ...process.env }` — so without defense, every agent command would inherit every secret (`env`, `printenv`, any script). Two layers defend this.

## Layer 1 — spawn-side env scrub

`extensions/bash-secret-scrub.ts` registers a **BashSpawnHook** that strips pi's secret env vars from each child's env:

```ts
const spawnHook: BashSpawnHook = ({ command, cwd, env }) => ({
  command, cwd, env: scrubEnv(env, stripSet),
});
```

`scrubEnv(env, strip)` (`src/utils/scrub-env.ts`) is **pure**: returns a new object, never mutates the input, unit-testable without spawning. The strip set is rebuilt on `session_start`.

## Layer 2 — output-side streaming redaction

`wrapWithRedaction` wraps the bash operations so every onData chunk is redacted before the tool accumulates it (live preview, truncation temp file, final result all redacted). Full design (`src/utils/redact-output.ts`):

### Constants
- `REDACTION_MIN_VALUE_LENGTH = 4` — values below this are skipped (a 2-3 char value would substring-match ordinary output everywhere).
- `REDACTION_MASK = "*"` — single fixed char avoids leaking the value's length.

### redactText(text, values)
Exact-value replacement on the FINAL string. Longer values scanned first so a shorter substring doesn't mask a longer match. Split values cannot slip through (matched whole).

### overlapTailLen(text, values)
The longest suffix of `text` that is a prefix of some value. Cap is `value.length` (NOT value.length-1) — with single-char length-changing masking + safe-slice-only redaction, a full value at the boundary must be held entirely. (Compare sigillo: caps at value.length-1 because it redacts the whole buffer in place with a length-preserving mask.)

### createStreamingRedactor(values)
Pending buffer + overlap-tail hold-back + redacted safe prefix per push; `finish()` flushes the tail (now known complete-but-unmatched). **Zero-allocation pass-through** when no secrets are wired. Values read lazily per exec (via getter) so a session_start recompute reflects on the next command. Multibyte safety: a value split across chunks is held by the overlap tail; a multibyte char split across chunks is held by the streaming `TextDecoder("utf-8", { fatal: false })`.

## The policy chain

- `readLocaltermSecretEnvVarsForPi(stateDirectory)` reads `secrets.json` + `processes.json` under `~/.localterm`. **Names + envVars only — NEVER values.**
  - `secrets.json`: `{ secrets: [{ name, envVar }] }` — validated against `SECRET_NAME_PATTERN` + `ENV_VAR_PATTERN`.
  - `processes.json`: `{ processes: [{ name, requestedSecrets }] }` — finds the `pi` process entry, maps its requestedSecrets to envVars.
  - Tolerates missing/malformed files (returns `[]`) so a broken install degrades to a no-op scrub, never a crash.
- **Canonical validation patterns** (mirror the server's zod schemas):
  - `SECRET_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/`
  - `PROCESS_NAME_PATTERN = /^[A-Za-z0-9_.+-]+$/`
  - `ENV_VAR_PATTERN = /^[A-Z_][A-Z0-9_]*$/`
  - A hostile policy file can never trick the scrub into deleting an unrelated env var.
- `readLocaltermSecretValuesForPi` pulls values from `process.env` — no Keychain, no daemon roundtrip. Recomputed on session_start.
- `readPiShellSettings(cwd)` merges global `~/.pi/agent/settings.json` + project `<cwd>/.pi/settings.json` (project wins) to preserve a user's `shellPath` + `shellCommandPrefix` through the tool reconstruction.

## The honest limit (read this)

Both layers are **defense-in-depth, NOT hard barriers**: a determined command can still reach keys via parent-process introspection (`ps eww $PPID` on macOS, `/proc/$PPID/environ` on Linux) or the Keychain directly. For untrusted/unmonitored agents, don't wire secrets to the pi process at all.

## The edge-case test suite (the contract)

`tests/redact-output.test.ts` pins the exact behavior:
- redactText: unchanged with no values; replaces every occurrence; skips below-floor; scans longer values first.
- overlapTailLen: returns the prefix-suffix overlap; 0 when none; 1 for a single leading char; ignores single-char values; longest across multiple values.
- createStreamingRedactor: pass-through with no values; **redacts a value split across two pushes without leaking its head**; redacts a whole-in-one-chunk value; **flushes an unmatched held tail verbatim on finish**; redacts multiple values across mixed chunks.

## Porting recipe

1. Copy `redact-output.ts` (redactor trio) + `scrub-env.ts` + the constants.
2. Wire a BashSpawnHook that scrubs child env (pure, no mutation).
3. Wrap the bash operations with the streaming redactor (lazy values, zero-alloc pass-through).
4. Read policy names-only files; pull values from process.env; validate with the canonical patterns.
5. Recompute on session_start.
6. Port `tests/redact-output.test.ts` — the edge cases ARE the contract.
