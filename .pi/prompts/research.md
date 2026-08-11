---
description: Deep research with multi-source verification for a question
argument-hint: "<question>"
---

# Research: $ARGUMENTS

Run bounded, evidence-driven research on a question and produce a cited report with confidence levels.
> Use for unfamiliar domains, current events, library/docs lookups, or anything needing multi-source verification.

## Read-only

This command is read-only. Research never mutates the repository and never
approves work; it feeds a later prewalk checklist schema.

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| Question | required | Research question or topic |

## Phase 0: Classify and Budget

Classify the question to pick ONE primary route before any tool call:

- Active-project code or architecture → codemap `mode: "ast"`.
- Inspiration repository under /home/ryanj/work/inspo/<repo> → codemap `mode: "cgc"` with the exact absolute context, one repository per query.
- GitHub repository behavior or overview → `mcp.deepwiki.ask_question` (owner/repo + one focused question), or a CGC clone when one exists.
- Current versioned library or framework docs → `mcp.context7.resolve-library-id` then `mcp.context7.query-docs`, max three single-topic queries per question.
- Discovery and current facts → `mcp.exa.omniroute_web_search`, bounded to 3-5 results.
- A selected URL's page content → `mcp.exa.omniroute_web_fetch`, selected URLs only.

Set the Budget: 3-6 angles, one primary route each, a per-source cap (3-5 search results, three Context7 queries, one DeepWiki question per repo), and a target of at most two sources per angle before Stop. Never fan out across tools.

## Phase 1: Plan Angles

Break the question into 3-6 distinct angles. Each angle is a separate search target:
- authoritative docs (official docs, spec, reference)
- opposing viewpoints (for contested topics)
- recent developments (what changed in the last 6 months)
- concrete examples (working code, real usage)

Ask the user to narrow the scope if the question is too broad to answer usefully. Parallel retrieval is allowed only for independent angles; never fire the same question at several tools at once. For independent angles, fan out with bounded read-only subagents: `subagents.all({ tasks: [{ key, agent: "explorer" | "reviewer", task, maxTurns, maxToolCalls, maxTokens }], concurrency: 2-4 })`. Children stay read-only and bounded; Main keeps synthesis and authority. Treat terminal outcomes as distinct (succeeded, failed, timed_out, budget_exhausted, invalid_result) and never fabricate evidence from a failed or exhausted child.

## Phase 2: Research Each Angle

For each angle, use the classified route and the exact MCP action names above. Escalate one step only on a named evidence gap ("the CGC context has no symbols for X", "Context7 lacks this version", "search shortlist lacks a primary source").

For every finding record:
- **Finding:** one-paragraph summary
- **Source:** exact URL or file:line
- **Date:** publication/access date
- **Confidence:** high (primary source, verified), medium (reputable secondary), low (unverified, blog, forum)

Never guess URLs. Never fabricate quotes or data. Never retrieve the same evidence twice through different tools. If a source is inaccessible, say so and move on.

## Phase 3: Cross-Check and Stop

Compare findings across angles:
- **Contradictions:** sources that disagree. Try to resolve with a primary source; if unresolvable, report both with confidence levels.
- **Outliers:** one source claiming something others do not. Flag it rather than silently dropping it.
- **Freshness:** for current-topic claims, prefer the newest dated source; note when a claim is time-sensitive.

Stop when one primary source answered the question, or two independent sources agree. Otherwise report the remaining evidence gap and ask; do not spawn more searches.

## Phase 4: Synthesize Report (output contract)

Write the report:

1. **Question:** [the question researched]
2. **Answer summary:** 2-3 sentences, highest-confidence answer first
3. **Findings by angle:** each with URL/file:line, date, confidence
4. **Contradictions:** resolved or flagged
5. **Open gaps:** what remains unknown and how to close it
6. **Evidence ledger:** a compact table of claim, source tool, exact call, source, date, confidence — ready to copy into a prewalk Schema references block
7. **Recommendation for this project:** what the research implies for the current codebase (if anything)

Every claim in the summary must trace to a finding with a source. No source, no claim.

## Persist Findings (optional)

If an active work item exists (`.pi/work/.active`) and the user wants the
report kept with the work, write it to
`.pi/work/$(cat .pi/work/.active)/research.md`. That write is a mutation:
submit a `prewalk.checklist({ ... })` inside fabric_exec with the matching
disposition (`easy: true` plus 2-4 items and Schema is the usual fit) and wait
for accepted handoff before writing.

## Prewalk boundary

Research discovery is read-only. Writing `research.md` under `.pi/work` is the
only mutation and requires an accepted prewalk handoff.

**Dual mode.** Read-only discovery is identical in both modes; only a durable
write branches by mode. Prewalk mode (armed): `prewalk.checklist({ ... })` with
accepted handoff before the write. Main-session mode (no prewalk): propose the
write to the user and apply only after explicit approval of the exact file and
content. Detect at the write boundary: accepted checklist → prewalk mode;
not-armed rejection or absent `prewalk` → main-session mode.

## Related Commands

| Need | Command |
| --- | --- |
| Create a feature from findings | `/create` |
| Audit a pattern | `/audit` |
| Verify gates | `/verify` |
