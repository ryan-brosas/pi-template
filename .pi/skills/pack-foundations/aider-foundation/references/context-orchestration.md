# Aider — Context orchestration

<!-- capsule-v1 -->

Source-grounded reference; read the orchestration ranges and their tests in full before porting.

## Layer context explicitly; archive turns safely

- **Path/Symbol:** `aider/coders/chat_chunks.py` — `ChatChunks.all_messages()` / `cacheable_messages()`; `aider/history.py` — `ChatSummary.summarize(messages, depth=0)` / `summarize_real(messages, depth=0)`.
- **Signature:** `all_messages()` yields one ordered prompt list; `summarize()` returns a bounded message list.
- **Data Shape:** chunks are `system`, `examples`, `readonly_files`, `repo`, `done`, `chat_files`, `cur`, `reminder`; each item is a role/content message.
- **Flow:** concatenate chunks in the fixed order `system → examples → readonly_files → repo → done → chat_files → cur → reminder`. When history exceeds budget, preserve a recent tail, summarize the earlier head, recurse at most three levels.
- **Invariant:** the active `cur` turn stays after archived context and before reminders; a summary boundary ends on an assistant message and `summarize()` repairs the final role when needed.
- **Probe:** `tests/basic/test_history.py::test_too_big`, `test_summarize`, `test_fallback_to_second_model`; inspect `aider/coders/chat_chunks.py` ordering directly.
- **Retrieve:** `mcp.codebase_memory.search_graph({project:"aider",query:"ChatChunks all_messages ChatSummary summarize"})`; inspect `aider/history.py:7-123` and `aider/coders/chat_chunks.py`.

## Porting verdict

**Adopt** the explicit active-versus-archived context split and fixed assembly order. **Adapt** summarization to the host token estimator and durable work ledger; omit Aider's markdown-history restoration format.