# Browser-Use — DOM Serialization Reference

Source-grounded reference for `browser_use/dom/service.py` (1,231 lines) and `dom/views.py`. Key ranges read in full.

## WHAT: accessibility tree merged across frames

`_get_ax_tree_for_all_frames(target_id)` :357-400: collect every frame id, fan out `Accessibility.getFullAXTree` per frame via `asyncio.gather(..., return_exceptions=True)`, root result first, MERGE node lists — detached/unreachable child frames are skipped with a debug log, not fatal. Snapshot tasks run concurrently (`ax_tree` + `device_pixel_ratio` gathered :593-594) with retry wrappers.

## WHY visibility walks ALL parents

`is_element_visible_according_to_all_parents(node, html_frames, viewport_threshold=1000)` :252+:

- CSS gate first: `display:none` / `visibility:hidden` / `opacity<=0` fail immediately; no bounds → invisible.
- **Bounds are COPIED before any mutation** — snapshot bounds are SHARED across consumers; in-place offsetting would corrupt everyone else reading the same snapshot.
- Then reverse-iterate the parent HTML-frame chain: an IFRAME/FRAME frame offsets current bounds by the iframe's position; a document frame requires INTERSECTION with its bounds accounting for scroll. An element inside a scrolled-out or clipped iframe fails even though its own CSS says visible. A frame node appears in its own chain and must skip itself.
- `viewport_threshold=None` disables viewport filtering entirely (CSS-only visibility).
- Cross-origin iframes: `_count_hidden_elements_in_iframes` :80 with size eligibility so tiny hidden frames don't dominate.
- `_get_viewport_ratio` :222 computes device-pixel scaling separately.

## WHERE the two representations diverge

`EnhancedDOMTreeNode` (`views.py:375-912`) is the internal tree: stable hashing (`compute_stable_hash` :830-858), xpath (:492-516), scrollability (:624-672). `SerializedDOMState` (:932-974) splits `llm_representation` (what the model reads, index-based) from `eval_representation` (what the action executor resolves back to nodes). Keeping these separate means prompt indexes never collide with execution lookups.

**The lessons: merge AX trees across frames but tolerate detached ones; copy shared snapshot geometry before mutating; visibility = CSS × ancestor-chain intersection × viewport; and keep the LLM-facing index space disjoint from the executor's.**
