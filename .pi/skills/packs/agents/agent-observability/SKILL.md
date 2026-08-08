---
name: agent-observability
description: "Use when adding tracing and observability to agents. Represent execution as a tree of spans (traceId, spanId, parentId, name, start, end), nest spans via parentId, propagate a single traceId across the tree, and collect spans per trace. Distinct from llm-evaluation (output scoring), streaming-agents (parts/handoff), and graph-memory (knowledge graph)."
version: 1.0.0
tags: [agents, observability, tracing]
dependencies: []
tools: []
---

# Agent Observability

## When to Use
You need to see what an agent did: which steps ran, how long they took, and how they nested. Model execution as a trace: a tree of spans. Use this for debugging latency, attributing cost, and replaying agent runs. Use whenever an agent has more than one step or calls sub-tools or sub-agents.

## When NOT to Use
- A single-step call with nothing to attribute. A log line is enough.
- You only score outputs (use llm-evaluation) or stream parts (use streaming-agents).
- You need relational memory over time (use graph-memory).

## Core Principle
A trace is a tree of spans. Each span has a traceId, a spanId, a parentId (null for the root), a name, a start, and an end. Children point at their parent; the traceId is shared across the whole tree. Collect spans by traceId to reconstruct the full run. The root span bounds the trace; child spans nest within it.

## The Span Model
- Span: { traceId, spanId, parentId (string | null), name, start, end (number | null) }.
- startSpan(name, parentId?): new spanId; traceId is inherited from the parent if given else newly minted; parentId is the parent spanId or null for the root; recorded under its traceId.
- endSpan(spanId, end): sets the span end.
- getTrace(traceId): all spans in that trace.
- children(parentId): spans whose parentId matches.

## Guardrails
- Propagate the traceId from parent to child; never mint a new traceId for a child of an existing span.
- The root has parentId null; every other span has a parentId that exists in the trace.
- Collect spans per traceId so a run reconstructs as one tree, not a flat list.
- End every span; an open span has end null and the trace is incomplete.
- Span start and end are monotonic within a trace; a child cannot end after its parent.

## Controlled Failure to Recovery (deterministic evidence)
- A root span has parentId null and a fresh traceId; it is recorded in its trace.
- A child span inherits the parent traceId and points at the parent spanId.
- A three-level nest (root, child, grandchild) shares one traceId; children() resolves the tree edges.
- endSpan sets the span end.
These are deterministic. Back the runtime with a unit test asserting traceId propagation, nesting, children resolution, and end.

## Provenance
Invariant independently rewritten from the langfuse SDK (langfuse-js and langfuse-python, MIT) in the inspiration library at <work-root>/inspo/langfuse-js and <work-root>/inspo/langfuse-python. Independently rewritten ideas need no license ceremony; no upstream code is copied verbatim. Verified against source: langfuse provides tracing and observability SDKs with spans, traces, parent-child nesting, and trace context propagation for LLM and agent applications (README; tests/).

<!--
source: /home/ryanj/work/projects/pi-core/.pi/skills/agent-observability/SKILL.md
adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved
license: pi-core private; see docs/sources.md
-->
