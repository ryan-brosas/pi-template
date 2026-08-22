---
name: aider-foundation
description: "Use when building AI pair-programming harnesses: token-bounded repository context, repairable edits, explicit file and consent gates, plan-to-edit handoff, diagnostic feedback, provider policy, and scoped Git safety."
disable-model-invocation: true
---
# Aider: AI Pair-Programming Foundation

## Use this for
Build or harden an AI coding harness that selects repository context under a token budget, turns plans into guarded edits, returns actionable repair diagnostics, and preserves user-controlled consent, retry, and Git boundaries. Aider source and direct tests are ground truth; the capsules carry decisive excerpts and live graph retrieval.

## Load the matching source dump
- `references/repomap.md` — PageRank-ranked tags, chat-file exclusion, and token-budget fitting.
- `references/context-orchestration.md` — fixed prompt ordering and tail-preserving history reduction.
- `references/edit-formats.md` — SEARCH/REPLACE matching ladder and loud repair failure loop.
- `references/edit-admission.md` — registered format dispatch, transcript sanitation on a mode switch, and per-target edit consent.
- `references/git-safety.md` — dirty baselines and edited-path-only commits.
- `references/undo.md` — git-backed unwind of only the last aider-owned, unpushed commit.
- `references/diagnostic-feedback.md` — preserved failing output with line-scoped structural context before model reflection.
- `references/collab.md` — AI-comment watch routing and bounded lint/edit reflection.
- `references/architect-handoff.md` — consent-gated plan-to-editor transfer in an isolated edit session.
- `references/ux.md` — grouped confirmation preference, explicit-yes protection, and multiline restoration.
- `references/model-policy.md` — exact-over-generic settings, deep overrides, and capped retry recovery.

## Capsule map
Each capsule pairs decisive evidence, a preserved invariant, a direct-test probe, and a live `search_graph` retrieval. The map records portable seams, not a source census.

- **Context selection and assembly** — `references/repomap.md`, `references/context-orchestration.md`: budget repository context and preserve the active turn while compressing archival history.
- **Edit protocol and mutation boundary** — `references/edit-formats.md`, `references/edit-admission.md`, `references/git-safety.md`, `references/undo.md`, `references/diagnostic-feedback.md`: select a compatible format, ask before expanding scope, reject unsafe matches, keep a reversible baseline, revert only the last aider-owned unpushed commit, and feed compact diagnostics back to the model.
- **Collaboration and consent** — `references/collab.md`, `references/architect-handoff.md`, `references/ux.md`: bound reflection, turn a reviewed plan into a separate edit pass, and never weaken explicit consent.
- **Provider policy and recovery** — `references/model-policy.md`: exact policy wins; user overrides merge deliberately; retry terminates at its time bound.

## Extending the foundation
Add one graph-selected, source-confirmed capsule per new portable seam. Add exactly one loader line and one grouped map reference; retain decisive source, an invariant, a direct-test probe, and a `search_graph` retrieval in the capsule rather than expanding this leaf.

## Provenance
Aider (Apache-2.0), `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index: 7,507 nodes / 19,923 edges, inspected 2026-08-16). Parse-partial tree/site/fixture ranges and 74 intentionally excluded non-code assets are a best-effort coverage caveat; source and direct tests remain authoritative.

## Full view (memory graph)
Revalidate `aider` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; Aider source and direct tests decide shipped claims.

## Boundaries
Adopt context selection, guarded edit admission, repair feedback, diagnostic reflection, consent, bounded retry, and scoped mutation contracts. Adapt model-provider dialects, editor/watch transports, and host Git integration. Omit Aider CLI/prompt wording, UI styling, analytics, onboarding, scraping, voice, and commit-message generation unless a target requirement needs them.