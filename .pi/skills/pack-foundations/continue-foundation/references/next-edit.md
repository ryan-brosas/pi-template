# Continue — Next-Edit Prediction Reference

Source-grounded reference for the Instinct next-edit paradigm (a distinct mechanism from FIM autocomplete). Files: `core/nextEdit/{constants.ts, NextEditProvider.ts, NextEditPrefetchQueue.ts, DocumentHistoryTracker.ts, NextEditEditableRegionCalculator.ts}`.

## Editing, not completing: sentinel-token prompting

Next-edit predicts the user's NEXT EDIT — modifying code in place — rather than completing a suffix. The prompt vocabulary is sentinel tokens defined in `constants.ts`: `INSTINCT_USER_CURSOR_IS_HERE_TOKEN`, `INSTINCT_EDITABLE_REGION_START/END_TOKEN`, `INSTINCT_CONTEXT_FILE_TOKEN`, `INSTINCT_SNIPPET_TOKEN` (`<|user_cursor_is_here|>`, `<|editable_region_start|>`, etc.). Model families (Instinct/Mercury) each get their own token sets (UNIQUE_TOKEN, MERCURY_CURRENT_FILE_CONTENT_OPEN...).

The system prompt (`INSTINCT_SYSTEM_PROMPT`, constants.ts:26+) is instructions-first: "Your role as an AI agent is to help developers complete their code tasks by predicting the next edit that they will make within the section of code marked by <editable_region_start> and <editable_region_end> tags... The developer may have stopped in the middle of typing." Marginal regions get tuning constants: top margin 0, bottom margin 5 lines (`constants.ts:4-5`).

**Lesson:** separate "predict the next edit" from "complete the token stream" — dedicated sentinel vocabularies per model family and an instructions-first system prompt make in-place editing suggestible.

## Editable regions, history, prefetch

- `NextEditEditableRegionCalculator.ts` computes which region is editable (cursor neighborhood, margin-constrained).
- `DocumentHistoryTracker.ts` tracks document versions to detect genuine edits vs cursor moves (vitest-covered).
- `NextEditPrefetchQueue.ts` warms predictions ahead of the cursor so suggestions appear instantly.
- `NextEditProviderFactory.ts` selects the model provider by model family.
- `constants.ts:3` gates the whole feature: `IS_NEXT_EDIT_ACTIVE = false` — the mechanism ships dormant behind one flag.

**Lesson:** ship latent paradigm machinery behind a single boolean; landing = flipping the flag after provider rollout, not a code merge.

## Verification

`DocumentHistoryTracker.vitest.ts` pins edit-vs-cursor classification; the editable-region calculator's margin constants are exercised through those tests; `NextEditProviderFactory` routes by the same family tokens enumerated in `constants.ts`.
