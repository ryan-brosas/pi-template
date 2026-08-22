---
name: mem0-foundation
description: "Use when building agent memory: memory add/extract/update/delete, scoped retrieval with metadata filters and reranking, vector-store backends, and SQLite history."
disable-model-invocation: true
---
# Mem0 Foundation

## Use this for
Agent memory that adds and extracts facts on write and serves scoped, reranked retrieval on read — over pluggable vector backends with SQLite history. Source and direct tests are the ground truth; references carry decisive excerpts and retrieval.

## Load the matching source dump
- `references/pipeline.md` — the V3 phased add pipeline: extract, add, update, delete on write.
- `references/scoping.md` — identity-stripping metadata templates, deliberate add-vs-search asymmetry, escaped scope keys.
- `references/search.md` — reject-don't-default validation, operator filter language, per-backend normalization.

## Capsule map
- **Add/search pipeline** — `references/pipeline.md`: LLM extract + add/update/delete on write; scoped retrieval with metadata filters and rerank.
- **Scoping & search** — `references/scoping.md`, `references/search.md`: user/agent/run scoping, filter operators, vector-store backends, SQLite history.

## Extending the foundation
Add one references-fileshaped capsule per new seam: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and `search_graph` retrieval.

## Provenance
Indexed in Codebase Memory as `mem0` (`/mnt/hdd/utopia/inspo/mem0`); source and its tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the write-time extraction pipeline, scoping, and reject-not-default validation; adapt vector-store and LLM backend; omit the hosted-api/cloud orchestration unless a target requires it.