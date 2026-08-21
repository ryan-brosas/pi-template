# Graphiti — Entity Node Extraction & Resolution Reference

Complete source-grounded reference for how entities enter the graph and survive deduplication. Files: `graphiti_core/utils/maintenance/node_operations.py` (1,032 lines) and `graphiti_core/nodes.py` (1,122 lines), both read in full.

## Extraction: one batched call, attribution built in

`extract_nodes` (node_operations.py:70-141) accepts one episode or MANY; a list gets its contents concatenated for ONE LLM extraction call while the FIRST episode supplies metadata. The prompt is chosen by episode source type — message/json/text — with a silent fallback to text "# Fallback to text extraction" (:271) so new EpisodeType members never break ingestion.

Multi-episode runs append an Episode Attribution instruction asking the model to emit `episode_indices` per entity, and the return signature carries a `node_episode_index_map` (UUID → 0-indexed episode positions). Empty names are filtered post-hoc.

**Lesson:** one LLM extraction call can serve many episodes only if you concatenate content AND instruct the model to attribute entities back to episode indices — metadata still comes solely from the first episode.

**Probe:** two episodes sharing an entity must yield `node_episode_index_map[uuid] == [0, 2]`; an unhandled source type falls back to extract_text.

## Entity typing: the id-registry with a curated catch-all

`_build_entity_types_context` (:152-176) always injects type id 0 = `Entity`, whose description encodes the recall/precision trade-off as few-shot examples:

> "A specific, identifiable entity that does not fit any of the other listed types… GOOD: a named entity not covered by the other types. BAD: 'luck', 'ideas', 'tomorrow', 'things', 'them', 'everybody', 'a sense of wonder', 'great times'. When in doubt, do not extract the entity."

Custom types get sequential ids with their class `__doc__` as description. The LLM echoes numeric ids (compact, unambiguous); out-of-range ids degrade to generic `Entity`. Because those docstrings contain extraction-specific GOOD/BAD examples that would poison downstream prompts, `_truncate_type_description` (:192-252) strips them for summarization — first paragraph, capped at three sentences, with sentence-end detection that avoids splitting on "e.g." or decimals like "2.0".

**Lesson:** give every custom type schema an id-numbered registry with one curated catch-all description, but never let extraction-oriented few-shot prose leak into downstream prompts — re-derive short descriptions per consumer.

**Probe:** tests :608-661 pin truncation exactly (`'First. Second. Third.'`), abbreviation safety, empty-string handling.

## Three-tier dedup: exact → cosine → defensive LLM

Resolution runs in escalating cost tiers (constants :63-65: MAX_NODES=30, NODE_DEDUP_CANDIDATE_LIMIT=15, cosine floor 0.6):

1. **Exact normalized-name collapse** within the run (:336-384) — deliberately narrow, per the design comment: "it only merges exact normalized-name duplicates that the extraction prompt should already have emitted once." Collisions prefer SPECIFICITY (more distinct non-'Entity' labels wins; tie by longer name), and discarded nodes' episode indices union into the survivor so attribution survives.
2. **Cosine candidate retrieval** per extracted name (no reranking), merged with cache overrides, deduped by uuid.
3. **One batched LLM judgment** for everything unresolved (:467-624) — candidates get relative ids 0..n-1, and the response is treated as UNTRUSTED:

> "The guardrails below defensively ignore malformed or duplicate LLM responses so the ingestion workflow remains deterministic even when the model misbehaves." (:476-479)

The guardrails each default to NON-MERGING: missing ids warn; extra/out-of-range ids warn with the full returned-id dump; duplicate relative ids are ignored; unknown positive candidate ids log "treating as no duplicate" and keep the extracted node. Rationale: "a wrong merge corrupts the graph irreversibly" — redundant nodes are recoverable, wrong merges are not.

Batch embedding degrades to per-query semaphore_gather when batch embedding isn't implemented (:428-435).

**Lesson:** treat LLM dedup verdicts as untrusted integers — clamp ranges, dedupe repeated ids, default every anomaly to the non-merging branch so failures create redundant nodes instead of wrong merges.

**Probe:** tests :624/:664/:710 exercise each guardrail; mock an LLM returning id len(n)+5 and assert the extracted node survives unmapped.

## Summaries: free composition first, small-model flights second

Enrichment runs attributes then summaries (:726-782). Attributes use one parallel small-model call per node typed by the entity's pydantic model, merged with OVERLAY semantics — and a subtle trap called out verbatim (:813-819): shape-validate but DON'T round-trip `model_dump()`, because "returning model_dump() would expand defaults across all fields and clobber prior values that the merge above just preserved."

Summaries split by size: if appending connected edge facts stays under 2× MAX_SUMMARY_CHARS, string concatenation IS the summary — zero LLM calls (:876-879). Only genuinely long histories enter batched small-model "flights" of 30 nodes, processed concurrently, results matched back case-insensitively (duplicate names supported via lists), unmatched names warned at 30 chars. A per-node callback can veto summarization; `skip_fact_appending` matches the async graph-summary worker's prompt.

**Lesson:** exhaust free deterministic composition (fact appending) before paying for LLM compression — and never let validated-model dumps clobber stored partial attributes.

**Probe:** a short summary plus edge facts under 2× cap asserts ZERO LLM invocations (:750); callback veto at :776/:806; long summaries trigger flights at :882.

## Node taxonomy and provider traps

Four node classes on a uuid-only identity base (hash/eq on uuid alone, :163-171):

- **EpisodicNode** — raw provenance, immutable semantics; carries source, raw content, valid_at ("datetime of the original document creation"), entity-edge backlinks.
- **EntityNode** — the mutable resolved identity layer: name_embedding + summary described as a "regional summary of surrounding edges" + open attributes dict.
- **CommunityNode** — derived cluster aggregate; shares embedding machinery, not attributes.
- **SagaNode** — incremental-summarization watermark, carrying TWO clocks by design: max valid_at over summarized episodes (episode-time semantics for temporal consumers) vs last_summarized_at (wall-clock scheduling watermark) (:867-876).

Provider persistence quirks are quarantined in save/delete/load/convert seams (:1050-1079): Kuzu stores entity edges AS NODES so deletes need a RelatesToNode_ pass first; Neptune serializes embeddings as comma strings parsed on read; non-Kuzu reads pop storage columns back OUT of the attributes blob (a user attribute named "summary" would otherwise collide); per-group label suffixes are stripped on read; episodic converters hard-fail on null timestamps.

**Lesson:** when one node family serves many graph databases, isolate every backend quirk (edge-as-node storage, stringified vectors, attribute-blob pollution, label suffixing) in save/delete/load seams — never in domain logic.

**Probe:** delete an entity under a fake Kuzu provider asserting RelatesToNode_ removal precedes the node delete; round-trip an attribute literally named "summary" and assert it pops correctly; created_at=None raises ValueError.
