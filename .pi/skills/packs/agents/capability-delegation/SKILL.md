---
name: capability-delegation
description: "Use when a primary model lacks a capability (a modality like vision, or a specialized skill) needed for a sub-input. Detect the primary cannot process the input by modality, delegate that sub-input to a model that has the capability, and splice the result back into the primary context. Distinct from streaming-agents (peer handoff for routing); this fills a capability gap with a different model."
version: 1.0.0
tags: [agents, multimodal, orchestration]
dependencies: []
tools: []
---

# Capability Delegation

## When to Use
A primary agent or model encounters an input it cannot process (a text-only model given an image, a model without a tool it needs). Delegate that sub-input to a model that has the capability, take its output, and splice it back so the primary continues. Use to extend a capable-but-limited model with other models capabilities without switching the primary.

## When NOT to Use
- The primary already has the capability. Process directly.
- Routing work among peer agents (use streaming-agents).
- Validating or repairing the input (use structured-outputs or tool-call-repair).

## Core Principle
Detect the gap, delegate to a capable model, splice the result. The primary declares its capabilities (modalities and skills it can handle). For an input whose modality the primary lacks, find a delegate model that declares that capability, hand it the sub-input, and return its output labeled with the delegate. The primary never fakes a capability it lacks; it borrows one.

## The Delegation Model
- Model: { name, capabilities[], handle(input) -> output }.
- Input: { modality, content }.
- delegate(primary, others, input): if primary.capabilities includes input.modality, primary handles it (delegated: false); else find the first other whose capabilities include the modality (delegated: true, to: that model); else throw.
- The delegated result is plain text the primary splices into its context.

## Guardrails
- Delegate only when the primary truly lacks the capability; never delegate a modality the primary can handle.
- Throw, don't guess, when no model (primary or delegate) can handle the modality.
- Pick a deterministic delegate (first capable) so behavior is reproducible; let the user override the choice.
- The delegate returns a representation the primary can consume (e.g. an image description as text); the primary works on the splice, not the raw input.
- Declared capabilities are the contract; a model that silently fails on a declared modality is a bug.

## Controlled Failure to Recovery (deterministic evidence)
- The primary handles an input for its own capability without delegating.
- The primary delegates to a capable other when it lacks the capability.
- delegate throws when no model can handle the modality.
- delegate picks the first capable other when several qualify.
These are deterministic. Back the runtime with a unit test asserting own-capability handling, delegation, the no-capability throw, and deterministic delegate selection.

## Provenance
Invariant independently rewritten from the pi-vision-handoff extension (MIT) in the inspiration library at <work-root>/inspo/pi-plugin/pi-vision-handoff. Independently rewritten ideas need no license ceremony; no upstream code is copied verbatim. Verified against source: pi-vision-handoff gives text-only pi models vision by describing images with a chosen vision model and handing the text description back (README; package.json description).

<!--
source: /home/ryanj/work/projects/pi-core/.pi/skills/capability-delegation/SKILL.md
adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved
license: pi-core private; see docs/sources.md
-->
