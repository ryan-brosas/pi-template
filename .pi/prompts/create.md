---
description: Create a specification with PRD, tasks, and workspace setup
argument-hint: "<description>"
---

# Create: $ARGUMENTS

Create a specification (PRD), set up the workspace, and define executable tasks — ready for `/ship`.
> **Workflow:** **`/create`** → `/ship`

## Parse Arguments

| Argument | Default | Description |
| --- | --- | --- |
| `<description>` | required | What to build/fix (quoted string) |

## Determine Input Type

| Input Type | Detection | Action |
| --- | --- | --- |
| Quoted text | `"description here"` | Create PRD from description |
| Short form | Simple string | Ask for more detail if needed |

## Before You Create

- **Be certain**: only create specs with clear scope
- **Don't over-spec**: if the description is vague, ask clarifying questions first
- **Check duplicates**: always check for existing work
- **No implementation**: create specs and workspace — do not write implementation code
- **Verify PRD**: before saving, verify all sections are filled (no placeholders)
- **Flag uncertainty**: use `[NEEDS CLARIFICATION]` markers for unknowns — never guess silently

## Phase 1: Duplicate Check

### Context Search

Search `.pi/artifacts/MEMORY.md` for prior decisions and similar work:
```bash
rg -n "topic" .pi/artifacts/MEMORY.md
```

Also search code history: `git log --oneline -20` for related work, and codemap
search for existing features that might already cover the request.

### Existing Work Check

Check `.pi/artifacts/.active` for existing work in progress. If an active slug exists with a `spec.md`, ask the user if they want to continue with `/ship` instead.

## Phase 2: Choose Research Depth

Ask the user how much codebase research they need:
- **Deep (recommended for complex work)** — patterns, tests, deps, best practices
- **Standard** — patterns + tests
- **Minimal** — quick file scan
- **Skip** — they know the codebase

## Phase 3: Gather Context (read-only)

Based on the research depth choice, run direct read-only discovery:
- **Deep**: codemap search for relevant symbols/patterns; read tests to learn conventions; inspect dependency manifests; check docs for architecture guidance.
- **Standard**: codemap search + read the tests for the nearest existing feature.
- **Minimal**: quick `rg`/codemap scan of the affected areas.
- **Skip**: no discovery; use existing AGENTS.md context.

While discovery runs, ask clarifying questions if the description lacks scope or expected outcome. For bugs, ask for reproduction steps and expected vs actual behavior.

## Phase 4: Initialize Workspace

Extract title and description from `$ARGUMENTS`:
- Single line → use it for both title and description.
- Multiple lines → first line as title, full text as description.

Derive a kebab-case slug from the title. This slug becomes the feature's namespace:
```bash
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
mkdir -p ".pi/artifacts/$SLUG"
echo "$SLUG" > ".pi/artifacts/.active"
```

## Phase 5: Determine PRD Rigor

Not every change needs a full spec. Assess complexity to choose the PRD level:

| Signal | Lite PRD | Full PRD |
| --- | --- | --- |
| Scope | Simple, single-concern | Cross-cutting, multi-system |
| Risk | Low blast radius | Touches auth, data, public API |
| Unknowns | Few | Many open questions |

Lite PRD when the change is small and well understood; full PRD otherwise.

## Phase 6: Write the PRD

Render the PRD from `.pi/templates/prd.md` into `.pi/artifacts/$SLUG/spec.md`, filling every section with the gathered requirements, goals, non-goals, and acceptance criteria.

Every acceptance criterion must be checkable:
- Observable behavior (what the user or system can verify)
- A verification command or manual check per criterion
- No criterion like "make it good" or "works correctly" without a concrete check

Flag unknowns with `[NEEDS CLARIFICATION]`.

## Phase 7: Define Tasks

Render the task breakdown from `.pi/templates/tasks.md` into `.pi/artifacts/$SLUG/tasks.md`.

Each task must be:
- Independently shippable (its own end state)
- Verifiable (an explicit check exists)
- Scoped with `depends_on` / `files` metadata so `/ship` can order them

## Prewalk boundary

Research, question-asking, and PRD drafting are read-only. Before writing the
workspace files (spec.md, tasks.md, .active), call
`prewalk.checklist({ items, schema })` inside fabric_exec with 5-9 ordered items
and an explicit schema contract; wait for accepted handoff, then write as the
executor. If acceptance is denied or scope changes, do not mutate.

## Output

1. **PRD:** `.pi/artifacts/$SLUG/spec.md`
2. **Tasks:** `.pi/artifacts/$SLUG/tasks.md`
3. **Workspace:** slug recorded in `.pi/artifacts/.active`
4. **Next step:** `/ship $SLUG` to implement

## Related Commands

| Need | Command |
| --- | --- |
| Deeper planning | `/plan` |
| Implement the spec | `/ship` |
| Verify gates | `/verify` |
