# Aider — Model policy and bounded recovery

<!-- capsule-v1 -->

Graph-first, source-grounded reference for the Aider provider/retry seam. Read the decisive ranges in full before porting.

## Provider policy is a precedence pipeline

- **Path/Symbol:** `aider/models.py` — `Model.configure_model_settings(model)`, `Model.send_completion(messages, functions, stream, temperature=None)`, `Model.simple_send_with_retries(messages)`.
- **Signature:** configuration mutates a `Model`; completion accepts `list[dict]`, optional function definitions, streaming mode, optional temperature, returning `(request_hash, response)`.
- **Data Shape:** `MODEL_SETTINGS` entries carry capability flags and `extra_params`; request kwargs assemble `model`, `stream`, optional `temperature`, tools, provider overrides, timeout (600s), then messages.
- **Flow:** exact model settings apply first; generic rules run only when no exact match; `aider/extra_params` deep-merges last. Request construction honours capability flags; the retry loop consults the exception table and doubles delay from 0.125s to the 60s cap.
- **Invariant:** an exact declaration is never overwritten by generic matching; a non-retryable error or delay past the cap stops rather than looping forever.
- **Probe:** `tests/basic/test_models.py::test_configure_model_settings` and `test_aider_extra_model_settings`; `tests/basic/test_sendchat.py::test_simple_send_with_retries_rate_limit_error` and the non-retryable case.
- **Retrieve:** `mcp.codebase_memory.search_graph({project:"aider",query:"Model configure_model_settings send_completion simple_send_with_retries"})`; inspect `aider/models.py:385-435,985-1082`.

## Porting verdict

**Adapt** the ordered policy-table/override/retry shape. Keep provider transport and exception classes host-specific and out of an install-free template.