<!-- capsule-v2 -->
# Model policy — exact-settings precedence and bounded retry backoff

**Source:** Aider MIT `main@5dc9490bb35f9729ef2c95d00a19ccd30c26339c`; Codebase Memory project `aider` (full index). **Question:** How does a harness pick per-model settings with precedence and limit provider retries instead of looping forever?

## Path/Symbol
`aider/models.py`: `Model.configure_model_settings(model)` (:385), `Model.send_completion(messages, functions, stream, temperature=None)` (:958), `Model.simple_send_with_retries(messages)` (:1039). `RETRY_TIMEOUT = 60` (:26), `request_timeout = 600` (:28).

## Signature & Data Shape
`configure_model_settings` mutates the `Model` given a settings table; `simple_send_with_retries` returns routed content (reasoning content stripped) or `None`. `MODEL_SETTINGS` entries carry capability flags and `extra_params`; the `aider/extra_params` entry deep-merges last.

## Decisive source — exact match beats generic; extra_params deep-merge last (:385-423)
```python
def configure_model_settings(self, model):
    exact_match = False
    for ms in MODEL_SETTINGS:
        if model == ms.logname:  # or "provider/<model>"
            self._copy_fields(ms)
            exact_match = True
            break
    if not exact_match:
        self.apply_generic_model_settings(model)
    if self.extra_model_settings and self.extra_model_settings.extra_params and self.extra_model_settings.name == "aider/extra_params":
        for key, value in self.extra_model_settings.extra_params.items():
            if isinstance(value, dict) and isinstance(self.extra_params.get(key), dict):
                self.extra_params[key] = {**self.extra_params[key], **value}
            else:
                self.extra_params[key] = value
```
An exact declaration is never overwritten by generic matching; the user's `aider/extra_params` override deep-merges last.

## Decisive source — bounded retry with a 60s cap (:1039-1085)
```python
def simple_send_with_retries(self, messages):
    retry_delay = 0.125
    while True:
        try:
            _hash, response = self.send_completion(messages=messages, functions=None, stream=False)
            if not response or not hasattr(response, "choices") or not response.choices:
                return None
            return remove_reasoning_content(response.choices[0].message.content, self.reasoning_tag)
        except litellm_ex.exceptions_tuple() as err:
            ex_info = litellm_ex.get_ex_info(err)
            should_retry = ex_info.retry
            if should_retry:
                retry_delay *= 2
                if retry_delay > RETRY_TIMEOUT:
                    should_retry = False
            if not should_retry:
                return None
            time.sleep(retry_delay)
```
The exception table decides retryability; backoff doubles 0.125s up to the 60s cap, and past that (or on a non-retryable error) the loop returns `None` instead of spinning.

## Flow
1. `configure_model_settings` applies exact match, else generic; then deep-merges `aider/extra_params` (nested dicts merge recursively).
2. `send_completion` builds request kwargs honoring capability flags and provider overrides (long `request_timeout`).
3. `simple_send_with_retries` sends; on a retryable exception doubles the delay, bounded by `RETRY_TIMEOUT`, and on success strips reasoning tags.

## Invariant
- An exact model declaration beats generic rules; `aider/extra_params` overrides both, deep-necessarily last.
- Non-retryable errors or backoff past the 60s cap terminate the loop (return `None`) rather than retrying forever.
- `reasoning` content is stripped from the returned text.

## Probe (direct test)
- `tests/basic/test_models.py::test_configure_model_settings` (:382) — exact-name policy beats generic; `test_aider_extra_model_settings` (:374) — extra_params deep-merge wins;
- `tests/basic/test_sendchat.py::test_simple_send_with_retries_rate_limit_error` (:24) — a retriable error triggers backoff retry.
Run `python -m pytest tests/basic/test_models.py tests/basic/test_sendchat.py`.

## Retrieve (graph)
```ts
await mcp.codebase_memory.search_graph({ project: "aider", query: "configure_model_settings simple_send_with_retries RETRY_TIMEOUT", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adapt the exact-match-then-generic precedence and the capped doubling backoff as the provider policy. Keep the transport and exception table host-specific; port the precedence and bounded-retry contract.
