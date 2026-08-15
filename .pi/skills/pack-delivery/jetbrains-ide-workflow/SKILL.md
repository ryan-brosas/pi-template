---
name: jetbrains-ide-workflow
description: "Use when a JetBrains IDE is connected and development should use IDE-aware search, refactoring, editing, diagnostics, builds, runs, or debugging."
disable-model-invocation: true
---

# JetBrains IDE Workflow

When `ide_idea_*` tools are available, make the JetBrains project model the
development surface. Codebase Memory provides broad graph orientation; the IDE
provides exact project-aware source operations and validation.

## Tool Order

1. Search with `ide_idea_skill_search`: file for paths, text/regex for literals,
   and symbol for declarations. Use `ide_idea_search_symbol` before call analysis.
2. Read bounded ranges with `ide_idea_read_file`, including dependency and
   decompiled library sources when needed.
3. Use `ide_idea_get_symbol_info` for resolved signatures and documentation, and
   `ide_idea_analyze_calls` for incoming/outgoing call hierarchy.
4. Mutate only through `ide_idea_apply_patch`, `ide_idea_create_new_file`, or
   `ide_idea_rename_refactoring`. Prefer semantic rename over text replacement.
5. Reformat changed files with `ide_idea_reformat_file` when the language has an
   IDE formatter.
6. Run `ide_idea_lint_files` on changed files. Resolve reported warnings/errors
   or document why the IDE could not analyze a file.
7. Discover run targets with `ide_idea_get_run_configurations`; execute the exact
   returned configuration or run point with `ide_idea_execute_run_configuration`.
8. Use `ide_idea_build_project` when the repository has an IDE build, then run
   the repository's canonical checks independently. A build alone is not done.

Use `ide_idea_open_file_in_editor` only to request focused human review at a
specific location. Preserve unrelated IDE and working-tree changes. Shell tools
remain appropriate for Git and repository checks, not source-file mutation.

<skill_result>
  <skill>jetbrains-ide-workflow</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>IDE-aware search/edit/refactor plus diagnostics and behavioral checks</evidence>
  <artifacts>Changed files, inspections, run/build results</artifacts>
  <risks>Unavailable IDE capability, unanalyzed file, unrelated drift, or none</risks>
</skill_result>
