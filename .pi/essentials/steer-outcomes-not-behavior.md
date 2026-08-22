# Essential: Steer Outcomes, Not Behavior (AGENTS.md / System Prompts)

Source: Discord conversation with mentor Tom, 2026-08-11. The complementary
half of the operating philosophy. Treat as an essential.

## The core principle
Don't over-restrict the agent with scope discipline. An overly restricted
AGENTS.md blocks the agent from finishing real problems. **Steer outcomes, not
behavior.**

## High-risk drifts in AGENTS.md (sound good on paper, but over-constrain)
These patterns steer BEHAVIOR and over-constrain the model:
- "Choose the simplest implementation that fully meets the current
  requirements. Avoid speculative abstractions, configuration, and indirection."
- "Grow the system in layers. Start from the smallest version that works end
  to end... Never trade a working product for unfinished complexity."
- "Make architectural decisions for the long term. Do not accept a stopgap
  that only works for now and is meant to be replaced later."
- "Study how established products solve the problem before designing a
  solution. Adopt their proven patterns and conventions rather than inventing
  an approach from scratch."

These are likely high-risk drifts — despite sounding good on paper.

## The fix: convert patterns into CI checks
Almost all of these patterns can be converted into a CI check:
- Let the AI rampage and do what it's good at.
- Then it steers itself to your idealized graph of implementation.
- Do the checks at the END, so you can iterate faster and let the agent do its
  testing loop.
- If you create PRs: create a PR, `gh watch` the CI, resolve any issues — a
  quick prompt to get it into a conclusive loop to round out the edges.

## The rule
- The idea is NOT to steer behavior, but to steer OUTCOMES.
- Everything should be technically verifiable, even code taste.
- Small exceptions are ok, but big overreaching ones affect the post-training
  portion of the agent.

## What this means for our setup
- Don't write AGENTS.md / system prompts that over-constrain the model with
  scope discipline or "simplest implementation" style rules.
- Encode the quality bar as CI checks / verifiable gates instead, and let the
  agent iterate freely toward the outcome.
- This complements the "code is ground truth, skills are shortcuts" philosophy:
  give the agent ground truth and let it work, then verify the outcome.
