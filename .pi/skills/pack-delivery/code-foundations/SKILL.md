---
name: code-foundations
description: "Use when a proven code pattern, primitive, or integration is worth reusing: encode it as a skill so future work reuses the shortcut instead of re-deriving it."
disable-model-invocation: true
---

# Code Foundations

Turn proven code into reusable skills. This is the shortcut-stacking mechanism: every foundation encoded once is a shortcut on every future use.

## When to encode

A piece of code becomes a foundation when:
- It solves a problem you will face again (component, utility, state machine, layout, integration).
- It is proven: working, tested, and understood — never speculative.
- It is a primitive others can drop in, not a bespoke feature.

## The encode loop

1. **Detect** — during implementation, notice a reusable primitive (the terminal video → kitty images → terminal browser → terminal trail).
2. **Extract** — isolate it as a documented, test-covered unit. A foundation you can't test isn't a foundation.
3. **Encode** — write a leaf skill (or add a line to an existing one): "when you need X, use this primitive at <path> / this pattern." The skill is a pointer + contract, not a re-description.
4. **Route** — add it to the matching pack so future work loads the skill instead of re-deriving the code.

## Skill anatomy for a foundation

- **name/description** — trigger-first: "Use when you need a shimmer...".
- **The primitive** — path to the code or the minimal form. The code stays ground truth.
- **The contract** — what it guarantees: behavior, tests, integration.
- **Provenance** — where it came from (own codebase, indexed inspiration repo, share-tech post) with commit/branch/license.

## Rules

- Encode only proven code — never speculative or half-built.
- The skill points at the code; it never re-describes it.
- One foundation per skill line; stack them.
- Cite provenance (adopt/adapt/omit from the inspiration gate).

## Red Flags

- Encoding a foundation before it's proven.
- Re-describing the code instead of pointing at it.
- A foundation with no test.
- A one-off feature encoded as a reusable primitive.

## Verification

- Every encoded foundation points at tested, working code.
- The skill is trigger-first and routed in a pack.
- Future work loads the skill instead of re-deriving.

## Skill Result Contract

```xml
<skill_result>
  <skill>code-foundations</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Proven primitive extracted, skill written, routed in a pack</evidence>
  <artifacts>Foundation skill + primitive path</artifacts>
  <risks>Unproven code, re-description, missing provenance, or none</risks>
</skill_result>
```
