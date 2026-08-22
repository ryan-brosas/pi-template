# Essential: The Operating Philosophy (Synthesized)

A unified synthesis of mentor Tom's three pillars, distilled into one
actionable guide. This is the "how we work" contract for the agent.

## The one-sentence version
Give the small model ground truth (code + skills), let it work freely, steer
it by verifiable outcomes — and stack every good output into a reusable skill
so the leverage compounds.

## Pillar 1 — Code is ground truth, skills are the shortcuts
- Don't hand the model markdown specs — they throw away code definitions and
  burn tokens re-iterating. Code is ground truth; the skill is the retrieval map.
- The reusable unit is the SKILL, not the spec. "Deepseek makes no mistakes,
  because the workflow is written in code or a skill somewhere."
- Prewalk is the best tool: give it context and let it search context, don't
  hand-plan every step.
- Small models are agentically equal to frontier models; they just lack
  knowledge — so feed them ground truth.

## Pillar 2 — Steer outcomes, not behavior
- Don't over-restrict the agent with scope discipline or rules like "simplest
  implementation", "grow in layers", "long-term architecture", "study
  established products" — these are high-risk drifts that over-constrain the
  model and block it from finishing real problems.
- Convert patterns into CI CHECKS instead: let the AI rampage and do what it's
  good at, then it steers itself to your idealized implementation.
- Do checks at the END so you can iterate faster and let the agent run its
  testing loop. PR → `gh watch` CI → resolve = a conclusive loop.
- Everything should be technically verifiable, even code taste. Small
  exceptions are ok; big overreaching ones affect the post-training portion.

## Pillar 3 — Stack your leverage (code is your asset)
- "Code from scratch is cheap; code you hold is valuable." Stack your good
  code into skills — one good design becomes a design token for the LLM.
- The compounding effect: 2h for the first extension, 20m for the next, 30s
  after — because it looks back at your old code and practices.
- You don't need to know it's GOOD code, just that it's a GOOD OUTPUT. To
  improve without looking: "This design looks really good. Help me improve and
  generalize the code, while keeping the design output we have today."
- The skill-capture loop: let it try something impossible, see what tools it
  needs, do it 2-3 more times to get edge cases, then "Recall what we've done
  and capture everything into skills... do your due diligence on the small
  stuff and edge cases."
- Find the arbitrages closest to you; leverage comes in forms other than money.

## How this applies to our workflow
- The drain + pack-foundations IS Pillar 3: stacking code into reusable skills.
- The 7-gate foundations-workflow IS Pillar 2: enforce quality via verifiable
  gates (RED/GREEN, coverage, parity), not restrictive prose.
- Feeding the small model the foundation leaves IS Pillar 1: ground truth as
  the retrieval map.
- Capture edge cases into skills after every session — never lose the small
  stuff.
