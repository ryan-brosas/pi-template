---
description: Deep research with multi-source verification for a question
argument-hint: "<question>"
---

# Research: $ARGUMENTS

Run bounded, evidence-driven research on a question and produce a cited report with confidence levels.
> Use for unfamiliar domains, current events, library/docs lookups, or anything needing multi-source verification.

## Read-only

This command is read-only. Research never mutates the repository and never
approves work; it feeds a later Schema hypothesis evidence set.

## Parse Arguments

| Argument      | Default  | Description                                              |
|---------------|----------|----------------------------------------------------------|
| Question      | required | Research question or topic                               |
| `--slug <id>` | none     | Persist the report to `.pi/work/<id>/research.md` even without an active work item; do not set `.active` |

## Phase 0: Classify and Budget

Apply the evidence-validity principle first: a GitHub repository is never assumed to be valid or authoritative evidence just because it relates to the task or project. Topical relevance is a lead, not a warrant. Treat any repository like an arXiv preprint: potentially valuable, always provisional; extract claims only with provenance (owner/repo, commit SHA or branch, retrieval date, license), verify by reading the code, docs, and tests rather than the README, and cross-check any adopted claim against an independent source. A Codebase Memory graph is an indexed snapshot for navigation, not a truth store; confirm coverage and exact source because it can lag HEAD.

Classify the question to pick ONE primary route before any tool call:

- Active-project code or architecture → Codebase Memory architecture/graph/trace tools, then JetBrains IDE source and symbol tools for exact confirmation; use Pi Fovea when either graph is unavailable.
- Inspiration work → call `codebase-memory_list_projects`, select one indexed repository, then use `codebase-memory_get_architecture`, `codebase-memory_search_graph`, or `codebase-memory_trace_path`. Index only when absent or after a named large update; check coverage and never treat graph output as source truth.
- GitHub repository behavior or overview → `mcp.deepwiki.get-deepwiki-index` then `mcp.deepwiki.get-deepwiki-page`, or Codebase Memory when a local indexed project exists.
- Current versioned library or framework docs → `mcp.context7.resolve-library-id` then `mcp.context7.query-docs`, max three single-topic queries per question.
- Discovery and current facts → `extensions.openai_websearch`, bounded to 3-5 cited results.
- A selected URL's page content → a discovered read-only fetch/crawl capability, selected URLs only; do not invent an action.

Set the Budget: 3-6 angles, one primary route each, a per-source cap (3-5 web results, three Context7 topics, one DeepWiki index + page per repo), and a target of at most two sources per angle before Stop. Never fan out across tools.

## Phase 1: Plan Angles

Break the question into 3-6 distinct angles. Each angle is a separate search target:
- authoritative docs (official docs, spec, reference)
- opposing viewpoints (for contested topics)
- recent developments (what changed in the last 6 months)
- concrete examples (working code, real usage)

Ask the user to narrow the scope if the question is too broad to answer usefully. Parallel retrieval is allowed only for independent angles; never fire the same question at several tools at once. For independent angles, fan out with bounded read-only sub-agents when the session supports spawning them (each child: key, role, task, turn/tool/token caps; concurrency 2-4); otherwise run the same bounded probes sequentially in the main session. Children stay read-only and bounded; Main keeps synthesis and authority. Treat terminal outcomes as distinct (succeeded, failed, timed_out, budget_exhausted, invalid_result) and never fabricate evidence from a failed or exhausted child.

## Phase 2: Research Each Angle

For each angle, use the classified route and the exact discovered action names above. Escalate one step only on a named evidence gap ("Codebase Memory reports the path as skipped or partially parsed for X", "the IDE cannot resolve the symbol", "Context7 lacks this version", "search shortlist lacks a primary source").

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
6. **Evidence ledger:** a compact table of claim, source tool, exact call, source, date, confidence — ready to copy into a Schema hypothesis evidence block
7. **Recommendation for this project:** what the research implies for the current codebase (if anything)

Every claim in the summary must trace to a finding with a source. No source, no claim.

## Persist Findings (optional)

The report lands in `.pi/work/<id>/research.md` so `/create --from-research <id>`
can seed a spec from it. Resolve `<id>` in this order:
1. `--slug <id>` in `$ARGUMENTS` → write there even without an active work item (provisional slug; do not set `.active` — `/create` owns that).
2. An active work item (`.pi/work/.active`) → write to `.pi/work/$(cat .pi/work/.active)/research.md`.
3. Otherwise → ask the user for a slug or leave the report in the reply for copy-paste.

That write is a mutation: run the Schema loop inside one `fabric_exec` —
`schema.hypothesize` (evidence: `file_contains`/`file_sha256` literals or the
verified command output) → `schema.verify` → `schema.commit` with
declared operations and nonempty postconditions — before writing.

## Schema boundary

Research discovery is read-only. Writing `research.md` under `.pi/work` is the
only mutation and requires a Schema commit.

**Dual mode.** Read-only discovery is identical in both modes; only a durable
write branches by mode. Schema mode (`schema.status().mode === "enforce"`):
run `schema.hypothesize → verify → commit` in the same `fabric_exec` as the
write. Main-session mode (guard off or project untrusted): propose the
write to the user and apply only after explicit approval of the exact file and
content. Detect at the write boundary: `schema.status()` reports `enforce` →
Schema mode; otherwise → main-session mode.

## Related Commands

| Need                           | Command   |
|--------------------------------|-----------|
| Create a feature from findings | `/create --from-research <id>` (seed the PRD from `research.md`) |
| Audit a pattern                | `/audit`  |
| Verify gates                   | `/verify` |
