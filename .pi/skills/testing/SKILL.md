---
name: testing
description: Behavioral testing guidance. Write named test modules that probe real seams, test the full module after changes, and inspect failures instead of rerunning unchanged checks. Use for every task that changes behavior.
---

# Testing

Tests are the executable half of the prewalk acceptance contract. Each checklist
validation should map to a named test or validator.

## When to use

- Whenever a checklist item has an executable validation.
- After any edit, to prove the behavior the edit claims.

## Rules

1. Prefer direct behavioral probes over static checks; use real fixtures.
2. Name test suites after the seam they pin (prewalk-contract, mcp-routing,
   template-smoke, extension).
3. Run the full test module the change lives in, not just the test you expect to
   flip.
4. For expected nonzero probes use settle behavior; set one realistic timeout.
5. Inspect failures instead of rerunning unchanged checks; record the failing
   evidence ref and a scoped reason when a revision is needed.
6. Behavioral evidence belongs in the acceptance ledger alongside the probe
   output.

## Steps

1. Identify the seam (contract, routing, lifecycle, registration).
2. Write the smallest test that pins it, with named assertions.
3. Run the module; if a check fails, read the failure, fix the cause, then rerun.
4. Record passing command output as acceptance evidence.

## Pitfalls

- Testing only happy paths hides unavailable-provider, cancellation, and
  missing-secret behavior.
- A test that depends on ambient secrets or machine state is not reproducible.
