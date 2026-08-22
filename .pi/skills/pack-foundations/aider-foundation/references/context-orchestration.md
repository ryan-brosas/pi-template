<!-- capsule-v2 -->
# Context orchestration — fixed prompt chunk order + tail-preserving summarization

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a harness assemble a stable prompt ordering and shrink an over-budget history without losing the most recent turn?

## Path/Symbol
`aider/coders/chat_chunks.py`: `ChatChunks.all_messages()` (:16) and `cacheable_messages()` (:57). `aider/history.py`: `ChatSummary.summarize(messages, depth=0)` (:27) / `summarize_real(messages, depth=0)` (:33).

## Signature & Data Shape
`all_messages()` returns one ordered message list. `summarize()` returns a bounded list; it appends a synthetic closing assistant message if the last one is not assistant (so a conversation never ends mid-user-turn). `summarize_real` returns either the original list (fits budget) or a recursively compressed `summary + tail`.

## Decisive source — fixed assembly order (:16-25)
```python
def all_messages(self):
    return (
        self.system
        + self.examples
        + self.readonly_files
        + self.repo
        + self.done
        + self.chat_files
        + self.cur
        + self.reminder
    )
```
`cur` (the active turn) and `reminder` come last; archived/readonly/repo context sits earlier and can be cache-controlled (`add_cache_control` marks readonly+repo chunks cacheable) so the fixed head is warm in the cache.

## Decisive source — preserve a recent tail, summarize the head, recurse ≤3 depth (:27-60, :91-96)
```python
def summarize_real(self, messages, depth=0):
    total = sum(tokens for tokens, _ in self.tokenize(messages))
    if total <= self.max_tokens and depth == 0:
        return messages
    if len(messages) <= min_split or depth > 3:
        return self.summarize_all(messages)
    # walk backward building the tail up to ~half_max_tokens
    split_index = len(messages)
    for i in range(len(sized) - 1, -1, -1):
        if tail_tokens + tokens < half_max_tokens:
            tail_tokens += tokens
            split_index = i
        else:
            break
    # ensure the head ends on an assistant message (packed boundary safety)
    while messages[split_index - 1]["role"] != "assistant" and split_index > 1:
        split_index -= 1
    tail = messages[split_index:]
    summary = self.summarize_all(sized_head)
    if self.token_count(summary) + sum(_ for _, _ in sized[split_index:]) < self.max_tokens:
        return summary + tail
    return self.summarize_real(summary + tail, depth + 1)  # recurse up to depth 3
```
The most recent assistant turn always lands in the preserved tail; only the older head is summarized. Recursion is depth-bounded (≤3); beyond that `summarize_all` collapses the whole turn.

## Flow
1. `all_messages` concatenates the eight chunks in the fixed order; cache-control headers mark readonly+repo as cacheable anchors.
2. `summarize` tokenizes the assembled history; if it fits `max_tokens`, return as-is.
3. Otherwise split at a backward-walked boundary that keeps ~half the budget as a verbatim tail and the earlier head; ensure the head boundary ends on an assistant message.
4. Summarize the head, and if `summary+tail` still exceeds budget, recurse with `depth+1` up to 3; at the bound, `summarize_all` collapses.

## Invariant
- `cur` and `reminder` always follow archived/read-only context in `all_messages`.
- `summarize` never drops the most recent assistant turn; the boundary lands on an assistant message.
- Recursive depth is capped at 3, so a pathological history degrades to a full collapse rather than unbounded recursion.
- Cache control keeps the read-only/repo/system head cache-warm, so the appended live tail is the only uncached part.

## Probe (direct test)
`tests/basic/test_history.py`: `test_too_big` and `test_summarize` drive an over-budget `messages` and assert the tail's final assistant message survives in the bounded result; `test_fallback_to_second_model` covers model absence. The fixed chunk order is asserted structurally in `chat_chunks.py` (single concatenation, no conditional reorder).
Run `python -m pytest tests/basic/test_history.py`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "all_messages chat_chunks ChatSummary summarize tail", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the fixed chunk ordering plus tail-preserving, depth-bounded recursion as the context/compression contract. Adapt the token estimator and durable ledger to the host; keep the most recent turn always archived-last.
