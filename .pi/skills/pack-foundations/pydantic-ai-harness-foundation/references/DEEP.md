# Pydantic-AI-Harness Foundation — Deep Reference


# Pydantic-AI-Harness Foundation

A deep reference for pydantic-ai-harness (Pydantic Services Inc). MIT License. Branch `main`, commit c79fabc (2026-08-17). Root: `/mnt/hdd/utopia/inspo/pydantic-ai-harness`. Graph: 7518 nodes / 41573 edges. The reference **capability-based pydantic-ai harness**: every feature (memory, planning, spend, subagents, skills, media, repo-context, compaction) is an `AbstractCapability` + toolset, so the agent composes exactly what it needs. The sharpest parts: the **compaction package** (six strategies over a resolved context window) and the **spend budget**.

## Architecture

```
pydantic_ai_harness/compaction/       -> the crown jewel: six compaction strategies over a model-resolved context window
pydantic_ai_harness/spend/            -> Budget + SpendStore + snapshots + redis (cost control)
  _budget.py, _store.py, _snapshot.py, _exceptions.py
pydantic_ai_harness/planning/         -> PlanStore (Protocol) + InMemoryPlanStore + Postgres/Redis + events
pydantic_ai_harness/subagents/        -> _models (ModelOption, validate_restriction), _effort, _disk, _toolset
pydantic_ai_harness/memory/           -> _store, _postgres, _capability (persistent memory)
  pydantic_ai_harness/skills/         -> _loader, _capability (skill loading)
  pydantic_ai_harness/media/          -> _store, _walker, _mongo, _s3
  pydantic_ai_harness/repo_context/   -> _inventory, _loader, _toolset
  pydantic_ai_harness/code_mode/      -> CodeMode capability + CodeModeToolset
  pydantic_ai_harness/browser_use/    -> BrowserAgent toolset integration
  pydantic_ai_harness/prompt_injection_defender/ -> _capability
  pydantic_ai_harness/experimental/acp/ -> PydanticAIACPAgent (ACP adapter)
  pydantic_ai_harness/capability_creation/ -> CapabilityStore (write capabilities)
```

Hotspots (graph): BrowserAgent.run (239), CodeModeToolset.get_tools (90), CodeMode.get_wrapper_toolset (81), PydanticAIACPAgent.prompt (79), PostgresConnection.execute (77), SpendStore.get (72), CapabilityStore.write (71).

## Primitive 1: the capability/toolset abstraction

Every feature is an `AbstractCapability[AgentDepsT]` with a toolset:
- `CodeMode.get_wrapper_toolset(toolset)` (fan-in 81) — a capability can WRAP another toolset.
- `CodeModeToolset.get_tools` (fan-in 90) — exposes the tools.
- Capabilities compose: the agent gets exactly the toolsets for the capabilities it enables.

**The lesson: model every feature as a capability that (a) exposes a toolset and (b) may wrap another toolset — that's how you get modular, composable agents.**

## Primitive 2: the compaction package (compaction/) — the crown jewel

Every strategy triggers on an **absolute budget** — but a constant is wrong for every model it wasn't measured against. So:

**Context-window resolution (_context_window.py):**
- `resolve_context_window(model)` — returns the model's real window from `genai-prices` (a transitive dep of pydantic-ai-slim; `ModelProfile` has no context_window field as of 2.18). `None` when unknown — never a guessed number.
- `DEFAULT_CONTEXT_WINDOW = 200_000` — deliberately conservative (compacting early costs one summary; overestimating costs the whole request).
- `split_model_id` — `provider:model` -> parts; bare name -> (None, name).
- Wrapping models resolve to their reported model_id; FallbackModel reports a composite id that no registry matches -> None.
- **The lesson: resolve the real window from a price registry and fall back to a conservative constant; a fraction of the real window beats a hardcoded number.**

**The six strategies:**
1. `_sliding_window_compaction.py` — **zero-cost** trim of the oldest messages when over a message-count or token threshold; preserves tool-call/tool-return pairs; no LLM calls; runs in `before_model_request` so it's transparent.
2. `_summarizing_compaction.py` — LLM summary of older history.
3. `_tiered_compaction.py` — tiered (sliding -> summarizing as it grows).
4. `_clamp_oversized_messages.py` — clamp a single huge message.
5. `_clear_tool_results.py` — drop tool results.
6. `_deduplicate_file_reads.py` — dedupe repeated file reads.

Plus: `_pinning.py` (reinject_pinned — pinned messages survive), `_receipts.py` (ReceiptInfo, make/record/format receipt), `_shared.py` (find_safe_cutoff, find_token_cutoff, prepend_first_user_message, record_compaction_reclaim, resolve/validate_token_trigger, exceeds, estimate_token_count), `_manual.py`, `_warn_near_limits.py`, `_report_context_usage.py`.

**The lesson: offer a family of strategies — zero-cost trim first, LLM summary as the escalation, tiered in between — over a resolved context window, with receipts and pinning.**

## Primitive 3: spend budget (spend/)

- `Budget(Generic[AgentDepsT])` — enforces (bool), ttl, window.
- `BudgetSpec` — the TypedDict spec.
- `bucket(window, ctx, now)` — time bucket; `scope_key(budget, ctx, explicit)` — the scope; `store_key(budget, bucket_id, scope)` — the composite key.
- `SpendStore.get` (fan-in 72) — read spend; `_snapshot.py` — snapshots; `_redis.py` — distributed.
- `_run_identity(identity, window)` — per-run identity.

## Primitive 4: planning store (planning/)

- `PlanStore(Protocol)` — get_items/set_items/get_item/add_item/update_item/remove_item.
- `InMemoryPlanStore` + Postgres + Redis backends.
- `validate_table_name(table)` — injection guard for table names.
- `_events.py` — PlanEventEmitter: emit_created/emit_deleted/emit_mutation.
- `_snapshot(item)` — item snapshot for diffs.

## Primitive 5: subagent model restrictions (subagents/_models.py)

- `ModelOption` + `as_option(value)` — normalize model refs.
- `model_label(model)` — display label.
- `validate_restriction(agent_name, allowed, menu)` — a subagent can only use models in its `allowed` list; fails fast.

## How to use

- **When you need a modular agent** -> the capability/toolset abstraction: each feature is an AbstractCapability exposing a toolset, optionally wrapping another.
- **When you need context compaction** -> the compaction package: resolve the real window, then sliding-window (zero-cost) -> summarizing -> tiered; clamp oversized messages; clear tool results; dedupe file reads; pin the load-bearing messages; keep receipts.
- **When you need cost control** -> Budget + SpendStore with time buckets, scope keys, TTL.
- **When you need a plan store** -> the PlanStore Protocol with InMemory/Postgres/Redis backends + event emitter.
- **When you need subagent model limits** -> validate_restriction (allowed list per agent).

## Red Flags

- A hardcoded context-window constant (wrong for every model not measured against it).
- Compaction with no zero-cost tier (LLM summaries are expensive).
- Dropping tool-call/tool-return pairs in a sliding window.
- Compaction that doesn't preserve pinned messages.
- A budget with no scope key or TTL.
- A plan table name built without validate_table_name.

## Verification

- resolve_context_window returns the real window or None (never a guess).
- Sliding-window compaction preserves tool pairs and pinned messages.
- Tiered compaction escalates from trim to summary at the right threshold.
- Spend is bucketed, scoped, and TTL-capped.
- A subagent is refused a model outside its allowed list.

## Skill Result Contract

```xml
<skill_result>
  <skill>pydantic-ai-harness-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Capability/compaction pattern ported, provenance cited, verified</evidence>
  <artifacts>Capability + compaction + budget</artifacts>
  <risks>Wrong window, dropped pairs, unbounded spend, or none</risks>
</skill_result>
```
