<!-- capsule-v2 -->
# LLM client — provider-agnostic base with retry, caching, input cleaning

**Source:** graphiti MIT `<branch>@<commit>`; Codebase Memory `graphiti`. **Question:** how does an LL client abstract providers (OpenAI/Anthropic/Gemini/Groq) behind one ABC with retry, caching, and input cleaning?

## Connected graph-selected seam
**Path/Symbol:** `graphiti_core/llm_client/client.py` (295 lines): `LLMClient` (:75), `_clean_input` (:98-118), `_generate_response_with_retry` (:131-141), `_get_cache_key` (:153), `generate_response` (:197); `llm_client/cache.py` (`LLMCache`), `token_tracker.py` (`TokenUsageTracker`); providers `openai_client.py`, `anthropic_client.py`, `gemini_client.py`, `groq_client.py`.
**Signature:** `LLMClient(config, cache=False)` — holds model/small_model/temperature/max_tokens, optional `LLMCache` dir; `generate_response(messages, ...)` with retry (4 attempts, exponential backoff 5-120s, retry on server/rate-limit errors).
**Data Shape:** `_clean_input` strips invalid unicode, zero-width chars, control chars (keeps `\n\r\t`); `_get_cache_key` hashes messages for the cache; `TokenUsageTracker` tracks spend.

### Decisive source
```ts
class LLMClient(ABC):
    def _clean_input(self, input):
        cleaned = input.encode('utf-8', errors='ignore').decode('utf-8')  # drop invalid unicode
        for char in '\u200b\u200c\u200d\ufeff\u2060': cleaned = cleaned.replace(char, '')  # zero-width
        cleaned = ''.join(c for c in cleaned if ord(c) >= 32 or c in '\n\r\t')  # drop control chars
        return cleaned
    @retry(stop=stop_after_attempt(4), wait=wait_random_exponential(multiplier=10, min=5, max=120),
           retry=retry_if_exception(is_server_or_retry_error), reraise=True)
    async def _generate_response_with_retry(self, messages, ...): ...
```

**Flow:** providers implement `_generate_response`; the base wraps it with retry (4 attempts, exponential backoff, retry on server/rate-limit errors), cleans input (invalid unicode/zero-width/control chars), and optionally caches via `_get_cache_key` + `LLMCache`. `TokenUsageTracker` tracks spend.
**Invariant:** input is cleaned before hitting the provider (invalid unicode/control chars can't break the call); retry is bounded (4 attempts, exponential backoff); caching is opt-in; token usage tracked.
**Probe:** `tests/` llm-client tests (input cleaning strips zero-width/control; retry on server error; cache key + hit; token tracking).

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "graphiti", query: "LLMClient generate_response retry cache clean_input token_tracker", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the provider-agnostic LLM client base (input cleaning, bounded retry, opt-in caching, token tracking); adapt the provider clients and retry policy to host.
