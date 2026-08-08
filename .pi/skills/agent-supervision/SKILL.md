---
name: agent-supervision
description: "Use when overseeing a long-running agent to keep it on-goal. Observe each turn against the goal: detect drift (the turn diverges), emit a steer (a correction to refocus) only when drifted and not done, and signal done when the goal is reached. Done takes precedence over drift (no steer once done). Distinct from streaming-agents (peer handoff) and goal-loop-audit (goal-list staleness); this is per-turn supervision with steering."
version: 1.0.0
tags: [agents, oversight, safety]
dependencies: []
tools: []
---

# Agent Supervision

## When to Use
A long-running agent can drift from its goal turn by turn. A supervisor observes each turn against the goal, steers it back when it drifts, and signals when the goal is reached. Use for long or unsupervised runs where silent drift wastes budget.

## When NOT to Use
- Routing work among peer agents (use streaming-agents).
- Auditing a goal list for staleness (use goal-loop-audit).
- A single short task; no drift risk.

## Core Principle
Observe, detect drift, steer, signal done. Each turn is checked against the goal with two predicates: is the goal done, and has the turn drifted from the goal. Done takes precedence: once done, no drift, no steer. When drifted and not done, emit a steer (a correction to refocus). The supervisor never steers after the goal is reached.

## The Supervision Model
- supervise(turn, goal, isDrift, isDone) -> { drift, steer?, done }.
- done = isDone(turn, goal).
- drift = !done && isDrift(turn, goal).
- steer = drift ? a correction referencing the goal : undefined.
- isDrift and isDone are injected predicates so supervision is testable and goal-specific.

## Guardrails
- Done takes precedence: a done turn is not drifted and gets no steer.
- Steer only when drifted and not done; never steer a done or aligned turn.
- Steer references the goal so the correction is actionable, not generic.
- Supervision is per-turn and read-only on the turn; it advises, it does not rewrite.
- Inject the predicates; keep the supervisor logic independent of how drift and done are defined.

## Controlled Failure to Recovery (deterministic evidence)
- A turn aligned with the goal: no drift, no steer, not done.
- A turn diverging from the goal: drift detected, a steer emitted, not done.
- A done turn: done true, drift false, no steer (done takes precedence).
- Steer is emitted only when drifted and not done.
These are deterministic. Back the runtime with a unit test asserting aligned, drifted, done-precedence, and steer-only-on-drift.

## Provenance
Invariant independently rewritten from the pi-supervisor extension (MIT) in the inspiration library at <work-root>/inspo/pi-plugin/pi-supervisor. Independently rewritten ideas need no license ceremony; no upstream code is copied verbatim. Verified against source: pi-supervisor observes every turn, steers when the agent drifts, and signals when the goal is reached (README; src/index.ts, src/subagent-detector.ts).

<!--
source: /home/ryanj/work/projects/pi-core/.pi/skills/agent-supervision/SKILL.md
adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved
license: pi-core private; see docs/sources.md
-->
