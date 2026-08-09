---
name: gemini-large-context
description: "Use when analyzing large codebases, comparing multiple files, or researching project-wide patterns that exceed typical context limits - leverages the Gemini CLI 1M-token context window."
disable-model-invocation: true
---

# Gemini CLI Large Context Analysis

## Use when

Large, multi-file, or project-wide analysis exceeds the local context window: codebase-wide searches, multi-file comparisons, pattern discovery, feature verification across many files.

## Do not use when

Small, focused tasks that fit normal context or require edits; Gemini non-interactive mode cannot approve file writes or shell commands.

## Workflow

1. Load the full operational reference only after this leaf matches: `references/workflow.md`.
2. Scope the paths: `gemini -p "@src/ @tests/ <focused question>"`.
3. Capture output to a file for long analyses; synthesize findings in your response.
4. Use read-only: never ask Gemini to modify files in non-interactive mode.

## Red flags

Unscoped `--all-files` scans; vague queries; asking Gemini to edit files; ignoring rate limits (60 req/min free tier).

## Skill Result Contract

```xml
<skill_result>
  <skill>gemini-large-context</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Paths scoped, question focused, output captured and synthesized</evidence>
  <artifacts>Analysis output or synthesized findings</artifacts>
  <risks>Unscoped scan, edits attempted, rate limits, or none</risks>
</skill_result>
```
