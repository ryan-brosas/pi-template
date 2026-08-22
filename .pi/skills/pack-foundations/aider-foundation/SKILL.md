---
name: aider-foundation
description: "Use when building AI pair-programming harnesses: repo maps, repairable SEARCH/REPLACE edits, bounded collaboration loops, provider policy, scoped Git safety, context compression, and terminal confirmation UX."
disable-model-invocation: true
---
# Aider: AI Pair-Programming Foundation

## Use this for
Build or harden an AI coding harness that must select repository context under a token budget, apply model-authored edits without silent fuzzy matches, return failures to the model through bounded loops, and preserve user-controlled Git and confirmation boundaries. Aider source and direct tests are ground truth; these references carry decisive excerpts and graph retrieval.

## Load the matching source dump
- `references/repomap.md` — PageRank-ranked tags, chat-file exclusion, and token-budget fitting.
- `references/edit-formats.md` — SEARCH/REPLACE matching ladder and loud repair failure loop.
- `references/collab.md` — AI-comment watch routing and bounded lint/edit reflection.
- `references/model-policy.md` — exact-over-generic settings, deep overrides, and capped retry recovery.
- `references/git-safety.md` — staged-plus-unstaged dirty baselines and edited-path-only commits.
- `references/context-orchestration.md` — fixed prompt ordering and tail-preserving compression.
- `references/ux.md` — grouped confirmation preference, explicit-yes protection, and multiline restoration.

## Capsule map
- **Token-bounded context** — `references/repomap.md`: rank definitions into a budget while excluding conversational control files.
- **Repairable edit application** — `references/edit-formats.md`: accept only bounded structural variations and return exact failure context without silent fuzzy edits.
- **Bounded collaboration loops** — `references/collab.md`: reflect edits and lint failures to the model within an explicit cap.
- **Provider policy and recovery** — `references/model-policy.md`: exact policy wins, overrides merge deliberately, and retry stops at the model-time bound.
- **Scoped change safety** — `references/git-safety.md`: snapshot existing dirt before editing and commit only model-edited paths.
- **Context assembly and compression** — `references/context-orchestration.md`: hold the active turn last and summarize only archived history with bounded depth.
- **Terminal confirmation UX** — `references/ux.md`: preserve explicit consent and restore input mode around nested prompts.

## Extending the foundation
Add one graph-selected, source-confirmed capsule per seam. Add one loader line and one map entry; keep decisive evidence, an invariant, a direct-test probe, and a `search_graph` retrieval in the capsule rather than expanding the leaf.

## Provenance
Aider (Apache-2.0), `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index: 7,507 nodes / 19,923 edges, recorded 2026-08-16). Cited source and test paths have metadata-match/no-precision-issue coverage (best-effort index evidence; source and tests authoritative).

## Boundaries
Adopt the pure context-selection, repair-loop, capped-retry, and scoped-mutation contracts; adapt provider dialects, editor/watch transports, and host Git integration; omit Aider CLI, prompt wording, UI styling, and commit-message generation unless required.
