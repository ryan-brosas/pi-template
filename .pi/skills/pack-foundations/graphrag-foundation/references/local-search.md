# GraphRAG — Local Search Reference

Source-grounded reference for entity-grounded retrieval. File: `packages/graphrag/graphrag/query/structured_search/local_search/mixed_context.py` (493 lines, head + structure read) with its context builders in `packages/graphrag/graphrag/query/context_builder/local_context.py` and `packages/graphrag/graphrag/query/context_builder/community_context.py`.

## Vector-seeded entity mapping, rated composition outward

`LocalSearchMixedContext` (`mixed_context.py:36-80`, constructor read in full) holds every table as id-keyed dicts: entities, community_reports, relationships, covariates, text_units. The pipeline:

1. The query is mapped to entities through an embedding vector store — keyed by `EntityVectorStoreKey.ID` (or `NAME`), giving matched entities and their similarity scores.
2. Context is composed outward from those matches: entity descriptions (optionally with `include_entity_rank` boosting important ones), relationships weighted by rank×weight, community reports around connected communities, covariates for matched entities, and source text units at the end ("source context").
3. Every table gets a `max_context_tokens` budget; contributors consume tokens in rate-based order until the cap — entities first, relationships second, community reports and text units last, mirroring local-specificity-to-global-theme ordering.
4. `return_candidate_context` controls whether the builder returns intermediate candidate lists useful for debugging or only the final context text.

Conversation history integrates via `packages/graphrag/graphrag/query/context_builder/conversation_history.py`, so follow-up questions re-map to the entities already under discussion.

**Lesson:** entity-centric retrieval = vector-match query→entities, then walk outward through precomputed relationship/community structures under a token budget — never raw graph traversal at query time.

## Community reports and web-guided importance

The `LocalContextBuilder` family is shared across modes: `build_local_context` (local_context.py) orchestrates the budgeted composition, and `get_candidate_communities` (community_reports.py) selects communities by matched entities. Covariates add tabular dimensions (claims, extractions) via `build_covariates_context` — the C (claims) in GraphRAG's entity-relationship-community-variable model.

## Verification

`tests/query/structured_search/` exercises the builder end-to-end: entity matches with rank/weight included produce ranked relationship tables via `build_relationship_context`, and `map_query_to_entities` (`graphrag/query/context_builder/entity_extraction.py`) returns both similarity-ranked matches and the source-text referencing them.
