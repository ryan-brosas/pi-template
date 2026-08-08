---
name: writing-skills
description: "Use when authoring, adapting, vendoring, curating, or verifying skills—selects behavior, integrity, or representative evidence based on the actual change and risk without imposing source or license ceremony on independently rewritten ideas."
version: 1.3.0
tags: [documentation, workflow]
dependencies: []
tools: []
---

# Writing Skills

## Evidence Law

<EXTREMELY-IMPORTANT>
**Match evidence to the change.** Behavior-changing guidance needs behavioral RED/GREEN evidence. Verbatim vendoring needs source and integrity evidence. Bulk curation needs complete inventory checks plus representative risk-based pressure tests.
</EXTREMELY-IMPORTANT>

Independently rewritten ideas and patterns require no license or provenance ceremony. Do not require source pins, hashes, notices, or legal review unless copied expressive material remains in the skill.

Do not manufacture a failing behavior baseline for content that is only being distributed unchanged. Do not call adapted behavior “verbatim” to avoid testing it.

## Select the Evidence Mode

| Mode | Trigger | Required evidence |
| --- | --- | --- |
| **Author or adapt** | New instructions, changed decisions, routing, safety gates, or materially rewritten prose | Fresh-child behavioral RED, minimum GREEN change, adversarial REFACTOR; no source paperwork for independent rewriting |
| **Vendor verbatim** | Exact upstream files copied without behavior changes | Exact source, applicable license or terms, required notices, source or byte parity, file allowlist, frontmatter/load smoke test, manifest parity |
| **Curate a collection** | Many independent upstream skills selected or filtered | Complete decision matrix, integrity checks for every copied file, and representative pressure tests by risk cluster |
| **Metadata or packaging repair** | Registration, path, frontmatter, or reference wiring only | Failing static/load check followed by focused and containing checks |

Escalate to **author or adapt** for any skill whose description, instructions, safety behavior, trigger, or tool contract changes. In curated collections, individually pressure-test broad routers, behavior-changing adaptations, destructive/financial/security workflows, and any outlier not covered by a representative risk cluster. A collection does not need one baseline agent trial per unchanged skill.

## Trigger, anti-trigger, and distinctness

Routing reliability depends on the description, not the body. Every skill `description` and its `## When NOT to use` section must let a reader or agent pick the right skill and reject the wrong one:

- **Trigger:** state exactly when to load it ("Use when …").
- **Anti-trigger:** state when NOT to load it, naming the nearest adjacent skills ("Do not use for …; use `diagnostics` or `fallow` instead").
- **Distinctness:** one line on what this skill does that the adjacent ones do not.

Before acting on a loaded skill, confirm its When-to-use and When-NOT-to-use still match the actual task; if they do not, do not use it — reload the right one. A skill without an anti-trigger or distinctness note is not finished.

When the fit-check is ambiguous between two or more candidate skills, do not guess. Retrieve the best-fit skill by intent before loading: query `hindsight_recall` (semantic memory of prior decisions and skill usage) or `codegraphcontext.find_code` (semantic search over indexed code) for the task outcome, and prefer the candidate whose retrieved context matches that outcome. Description-match alone cannot do this; retrieval can.

## Behavior Harness — Author or Adapt Only

Run RED before GREEN through fresh Fabric children inside fabric_exec:

```typescript
const red = await agents.run({
  name: "skill-red-pressure",
  tools: ["read"],
  task: "Execute the self-contained scenario without the candidate skill; return the scored rubric.",
});
const green = await agents.run({
  name: "skill-green-pressure",
  tools: ["read"],
  task: "Read the candidate SKILL.md, execute the same scenario, and return the scored rubric.",
});
```

The parent compares results and content hashes. Independent variants may run in waves of at most three. If the baseline already passes, first ask whether the candidate still adds a distinct behavior. Skip or vendor it; do not weaken the rubric merely to force RED.

## Vendor Integrity Harness

For unchanged upstream material:

1. Identify the exact repository/source and immutable revision.
2. Check the applicable license or terms, required notices, and complete approved file list.
3. Record source hashes or recursive byte parity.
4. Fail first on missing local files, wrong hashes, invalid frontmatter, missing references, or absent manifest entries.
5. Copy only approved files.
6. Re-run focused loading/integrity checks and the containing repository suite.
7. Record upstream test limitations without pretending integrity proves behavior quality.

## Curated Collection Workflow

1. Inventory every candidate from the source used for selection.
2. Decide `vendor`, `adapt`, or `exclude` with a reason and exact local path.
3. Group vendored skills by real risk: ordinary read-only guidance, external-tool guidance, mutation-capable workflows, security/privacy, and broad routing.
4. Verify every copied file deterministically.
5. Run representative pressure scenarios for each risk cluster; test every adapted or high-risk outlier individually.
6. Stop only the affected item or cluster when evidence fails. Do not discard an already-qualified collection because an unrelated baseline agent is competent.
7. Re-run manifest parity, load checks, and the full retained suite.

## Match the Form to the Failure

| Failure | Right form |
| --- | --- |
| Agent skips a required workflow | Behavioral recipe and pressure scenario |
| Vendored bytes drift | Source-parity and allowlist check |
| Collection imports unsafe extras | Complete matrix plus exclusion contract |
| Skill is undiscoverable | Frontmatter, reference, and manifest load test |
| Prose is bloated | Compression trial after behavior is locked |

## Red Flags

Calling an adaptation verbatim; copying moving `main`; copying upstream bytes without checking applicable terms; testing only a README count; requiring hundreds of duplicate agent trials for unchanged files; using one happy-path sample for a destructive skill; treating static integrity as behavioral proof; weakening a rubric to create artificial RED.

## Skill Result Contract

```xml
<skill_result>
  <skill>writing-skills</skill>
  <status>success|partial|blocked|failure</status>
  <mode>author-adapt|vendor-verbatim|curated-collection|packaging-repair</mode>
  <evidence>Behavior delta and pressure results, or source/integrity evidence plus representative risk-cluster results for copied material</evidence>
  <artifacts>Skill files and tests; source, terms/notices, and collection matrix only when copied material makes them applicable</artifacts>
  <risks>Untested behavior delta, copied-material drift or permission gap, unqualified content, weak risk coverage, or none</risks>
</skill_result>
```

<!--
source: /home/ryanj/work/projects/pi-core/.pi/skills/writing-skills/SKILL.md
adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved
license: pi-core private; see docs/sources.md
-->
