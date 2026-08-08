# User Profile

## Identity

- **Name:** Ryan Brosas
- **GitHub login:** `ryan-brosas`
- **GitHub profile:** `https://github.com/ryan-brosas`
- **Website:** `ryanjosebrosas.dev`
- **Role:** Developer and project maintainer
- **Repository relationship:** Owner and maintainer of `ryan-brosas/pi-template`

Evidence: authenticated `gh auth status`, `gh api user`, and `gh repo view` on 2026-08-09. GitHub profile bio: “Your mighty little friend.” The role is inferred from repository ownership and the current project conversation; update it if Ryan specifies a different professional role.

## Project Direction

Ryan describes this repository as a clonable pi.dev template inspired by `inspo/opencode-template`. The intended audience is developers. Stability is the primary definition of success.

When proposing work:

- Protect the clone-and-start experience.
- Prefer Pi-native and Ultra Fabric-native behavior.
- Treat the inspiration repository as a reference, not a compatibility requirement.
- Explain how a change affects reliability, setup, customization, and maintenance.
- Avoid speculative product expansion that weakens the stable core.

## Communication Preferences

- **Detail level:** Detailed
- Include concrete file paths, evidence, constraints, edge cases, and verification results.
- Explain architectural or workflow consequences when they affect future work.
- Keep structure clear with headings, lists, and small tables where useful.
- Avoid filler, cheerleading, and internal tool narration.
- State uncertainty directly and distinguish observed facts from inference.
- For choices, provide a recommendation and explain the important tradeoff.
- Do not reduce a complex result to a terse summary when implementation details or risks matter.

Repository AGENTS.md style rules still apply to every response and override softer presentation preferences.

## Git Workflow Preferences

- **Commit mode:** Auto-commit completed scoped work.
- Stage only files changed for the active request. Never use blanket staging in a dirty repository.
- Do not include unrelated user or concurrent-agent changes in a commit.
- Run the relevant verification gate before committing.
- If no trustworthy verification gate exists, inspect the scoped diff and state that limitation in the commit handoff.
- Use the repository's terse conventional commit style when the history supports it, such as `feat:`, `fix:`, `docs:`, or `chore:`.
- Never force-push shared branches or bypass hooks.
- Do not publish, open a pull request, or push unless the active request or repository workflow authorizes it.
- Auto-commit is a preference for finished work, not permission to commit partial, failing, or out-of-scope changes.

## Workflow Preferences

- Start non-trivial changes with evidence-backed discovery and an accepted prewalk checklist.
- Prefer the smallest stable slice over broad speculative refactors.
- Preserve existing and concurrent work in dirty repositories.
- Use semantic navigation before raw text search when source code exists.
- Read local templates, skills, prompts, and reference sources before inventing a new structure.
- Keep project artifacts detailed when their purpose is durable planning or handoff context.
- Verify behavior with commands when a runnable gate exists; use explicit structural inspection for prose-only/configuration repositories.
- Report what was verified locally and what still requires a live or fresh-clone check.

## Technical Preferences Known So Far

- Pi and Ultra Fabric are the preferred agent workflow foundation for this project.
- `inspo/opencode-template` is the design reference for the clonable-template concept.
- No language, application framework, database, UI framework, or deployment preference has been specified.
- No issue tracker has been selected.
- Stability outranks speed, UX polish, and maintainability when a tradeoff cannot satisfy all goals.

Do not infer additional technical preferences from installed host tools or unrelated repositories.

## Things to Remember

1. Ryan wants generated initialization artifacts to be detailed.
2. Ryan approved core setup, planning context, and user profile creation together.
3. Ryan prefers detailed responses and automatic commits for completed scoped work.
4. The repository is a template product, not an application scaffold.
5. The current working tree contains substantial pre-existing cleanup work; protect it.
6. Ask when a role, technical preference, branch policy, or release action is not explicit.

---

_Update this file when Ryan states a durable preference. Do not store secrets, transient task details, or speculative personal information._
