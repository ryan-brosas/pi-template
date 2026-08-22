<!-- capsule-v2 -->
# Repo map — whole-repo outline ranked by PageRank into a token budget

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a harness show an LLM a whole repository inside a token budget, pointed at the identifiers the conversation just mentioned?

## Path/Symbol
`aider/repomap.py`: `RepoMap.get_repo_map(chat_files, other_files, mentioned_fnames, mentioned_idents, force_refresh)` (:103), `get_ranked_tags(...)` (:365), `get_ranked_tags_map` (:576), `render_tree` (:710), `to_tree` (:748).

## Signature & Data Shape
`get_repo_map` returns a Markdown outline string (or None when `no other_files` / `max_map_tokens<=0`). `get_ranked_tags` returns a list of `(fname,)` or `(fname, ident, tag)` tuples ranked by personalized PageRank over a file-to-file reference graph.

## Decisive source — personalization steer and chat-file exclusion (:506-518, :529-533)
```python
# mentioned identifiers and naming style multiply rank; snake/kebab/camel names win
if ident in mentioned_idents:
    mul *= 10
if (is_snake or is_kebab or is_camel) and len(ident) >= 8:
    mul *= 10
if ident.startswith("_"):
    mul *= 0.1
if len(defines[ident]) > 5:
    mul *= 0.1
# a chat file referencing an ident steeply boosts that definition's rank
if referencer in chat_rel_fnames:
    use_mul *= 50
```
The conversation's own files never appear in the outline:
```python
for (fname, ident), rank in ranked_definitions:
    if fname in chat_rel_fnames:
        continue  # chat files steer rank but are never emitted
```

## Decisive source — budget fit with no-chat widening (:103-168)
```python
if not chat_files and self.max_context_window and target > 0:
    max_map_tokens = target  # empty chat sees the whole repo at map_mul_no_files
try:
    files_listing = self.get_ranked_tags_map(
        chat_files, other_files, max_map_tokens,
        mentioned_fnames, mentioned_idents, force_refresh,
    )
except RecursionError:
    self.io.tool_error("Disabling repo map, git repo too large?")
    self.max_map_tokens = 0
    return
```
The map is fitted by iteratively adding ranked definitions until the token budget is consumed (binary-search fit inside `get_ranked_tags_map`). A `RecursionError` disables the map rather than failing the session.

## Flow
1. build `defines`/`references` from tree-sitter tags per file (kind `def` vs `ref`);
2. add a low-weight self-edge (0.1) for definitions no other node references;
3. add weighted `referencer→definer` edges scaled by referenced-in-chat (×50), naming style, and mentions;
4. run `nx.pagerank` over a `MultiDiGraph` with the file personalization vector;
5. distribute each source node's rank over its out-edges and aggregate per definition;
6. sort, skip chat files, then fit into `max_map_tokens`.

## Invariant
- Chat files steer PageRank via their references but are emitted into the outline (`test_get_repo_map_excludes_added_files` :246).
- Mentioned idents / naming conventions and in-chat references raise the target definition's rank.
- The map is always bounded by `max_map_tokens`; pathological repos are disabled, not crashed.

## Probe (direct test)
`tests/basic/test_repomap.py`:
- `test_get_repo_map_with_identifiers` (:163) — imported identifiers (`MyClass`, `my_method`, `my_function`) appear fresh in an empty-chat outline;
- `test_get_repo_map_excludes_added_files` (:246) — files in chat (`test_file1/2.py`) are absent while other/included remain;
- `test_get_repo_map` (:21) and `test_repo_map_refresh_*` (:49, :106) cover cache refresh and token gating.
Run `python -m pytest tests/basic/test_repomap.py -k "repo_map"`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "get_ranked_tags get_repo_map search taxes", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the personalized-PageRank + token-budget fit as the reproducible context engine; keep chat-exclusion and the rank multipliers as the behavioral contract.
