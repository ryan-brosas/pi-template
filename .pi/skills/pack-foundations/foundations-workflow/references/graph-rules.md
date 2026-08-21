# Foundations Workflow — Graph Rules

The two mandatory graph touchpoints: authoring-time double-checks and use-time full views. Plus the coverage semantics and the pitfalls.

## Rule 1 — Authoring-time double-check (never skip)

**Always** run the graph deep-pass (Step 2) + coverage check (Step 3) before or while writing a foundation skill.

Why both directions:
- Source alone misses the graph's shape: hotspots by fan-in (the reused symbols ARE the primitives), package boundaries (the dependency map), entry points (the reading order).
- Graph alone is an index, not truth: it can be stale, partial, or exclude paths. Confirm every claim against real source.

## Rule 2 — Use-time full view (every foundation skill carries it)

The graph is not only for authoring. Every foundation skill ships a **Full view (memory graph)** section naming its indexed project, so *using* the skill routes back to the live graph. The inspo repo keeps evolving; the graph is how you get the full current view instead of trusting a frozen skill.

### The section template (mandatory in every lean SKILL.md)

```markdown
## Full view (memory graph)

Indexed in Codebase Memory as **`<project>`** (`<root_path>`, branch `<branch>`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "<project>", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "<project>", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "<project>", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "<project>", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.
```

Place it between **Key skill-lines** and the References index.

## Coverage semantics

| Status | Meaning | Action |
|---|---|---|
| `no_recorded_issue` + `metadata_match` | indexed and fresh | safe to cite |
| `no_recorded_issue` + `not_tracked` | indexed, freshness unknown | spot-check source |
| `excluded` / `not_indexed` | gitignore or skip-list | read from source directly; note it |
| `metadata_changed` | source moved since indexing | re-index before trusting |

`index_status({ project, verbose: true })` also reports the repo's ignore posture: `not_indexed.dirs` and `not_indexed.files` with reasons (gitignore / skip-list). Cite that in the reuse-guide so future readers know what the graph deliberately does not cover.

## Pitfalls (all hit in practice)

1. **Duplicate indexes.** `index_repository` without `name` derives one from the path. Re-indexing with a `name` override creates a SECOND index; the old one stays. Delete the stale one with `delete_project` after verifying the canonical index is fresh (`index_status` node counts must match expectations).
2. **Stale graph after edits.** The graph snapshots the committed tree; uncommitted working-tree changes are invisible (`search_graph` returns nothing for new symbols). Re-index after a batch of changes.
3. **Symbol search is code-only.** `search_graph` (BM25) surfaces functions/classes, not markdown. Skill files live in the graph as nodes (coverage proves it) but never surface in symbol search — skills are discovered through the pack router, the graph navigates code.
4. **Trusting coverage absence.** "No recorded issue does not prove completeness" — pair coverage with real reads.

## The canonical loop

```
author:  graph deep-pass + coverage check -> source confirm -> write skill (lean + split refs) -> wire -> check
use:     skill's Full-view section -> live graph for the repo's current full view -> source confirm -> port
```

Both directions graph-grounded. The inspo is never frozen.
