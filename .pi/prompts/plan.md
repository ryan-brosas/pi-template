---
description: Create a detailed implementation plan with TDD steps
argument-hint: ""
---

# Plan

Create a detailed implementation plan with TDD steps. Optional deep-planning between `/create` and `/ship`.
> **Workflow:** `/create` → **`/plan`** (optional) → `/ship`
> **When to use:** complex tasks where spec verification steps aren't enough guidance. Skip for simple tasks.

## Before You Plan

- **Be certain**: only create tasks you're confident about
- **Don't over-plan**: if the spec is clear, trust it
- **Budget context**: target ~50% context per execution
- **Vertical slices**: each task should cover one feature end-to-end

## Phase 0: Institutional Research (Mandatory)

Before touching the PRD, load what the codebase already knows.
**This step is not optional. Skipping it means planning in the dark.**

### Step 1: Search project context

Search `.pi/MEMORY.md` for bugfixes, existing plans, and prior decisions:
```bash
rg -n "topic" .pi/MEMORY.md
```

If relevant context is found, incorporate it directly into the plan. Don't re-solve solved problems.

### Step 2: Mine git history

```bash
# What has changed recently in affected areas?
git log --oneline -20

# Who wrote the relevant code and when?
git log --oneline --follow -- <relevant-file-path>

# What patterns appear in recent commits?
git log --oneline --all | head -30
```

Look for:
- Commit conventions (how this team names things)
- Recent changes to files you'll touch (merge conflict risk)
- How similar features were implemented before
- Any "fix:", "revert:", "hotfix:" commits near your scope (footgun zones)

### Step 3: Code Reconnaissance

Use codemap directly to map the affected area:
- codemap search for relevant symbols, patterns, and config keys
- codemap refs on the key functions to see callers and call sites
- codemap skeleton/explore for the subsystem structure

Then read 2-4 representative files (including tests) so the plan matches existing structure and conventions. Look for:
- existing patterns to follow
- files to be aware of (ownership, size, coupling)
- test patterns for this domain
- TODO/FIXME markers in relevant files

**Only after completing Phase 0** do you proceed to planning.

## Phase 1: Guards

Verify:
- `.pi/work/$(cat .pi/work/.active)/spec.md` exists (if not, tell the user to run `/create` first)
- If `.pi/work/$(cat .pi/work/.active)/plan.md` already exists, ask the user: overwrite or skip?

## Phase 2: Discovery Assessment

Determine discovery level from the PRD:

| Level | Scope | When to Use | Action |
| --- | --- | --- | --- |
| **0** | Skip | Pure internal work, existing patterns only (grep confirms) | Skip research, proceed to decomposition |
| **1** | Quick | Familiar domain, some unknowns | Focused search on the unknown parts |
| **2** | Standard | New domain or cross-cutting change | Full pattern + test + dep discovery |
| **3** | Deep | Unfamiliar stack or high-risk change | Extended discovery incl. external best practices |

## Phase 3: Goal-Backward Analysis

**Forward planning:** "What should we build?" → produces tasks.
**Goal-backward:** "What must be TRUE for the goal to be achieved?" → produces requirements.

### Step 1: Extract Goal from PRD

Take success criteria from the PRD. Must be outcome-shaped, not task-shaped.
- Good: "Working chat interface" (outcome)
- Bad: "Build chat components" (task)

### Step 2: Derive Observable Truths

"What must be TRUE for this goal to be achieved?" List 3-7 truths from the USER's perspective.

Example for "working chat interface":
- User can see existing messages
- User can type a new message
- User can send the message
- Sent message appears in the list
- Messages persist across page refresh

**Test:** each truth verifiable by a human using the application.

For UI PRDs include state and recovery truths, not just happy paths:
- User can understand where they are and what scope the screen/action affects
- User can identify the single primary action and the result of triggering it
- Empty, loading, error, and success states are visible where data/async work exists
- User can recover from failure with retry, undo, fallback, or support path
- Dangerous actions communicate consequences before execution
- Forms expose labels, helper text, validation, and accessible errors

### Step 3: Derive Required Artifacts

For each truth: "What must EXIST for this to be true?"

| Truth | Required Artifacts |
| --- | --- |
| User can see existing messages | Message list component, Messages state, API route, Message type |
| User can send a message | Input component, Send handler, POST API |

**Test:** each artifact = a specific file or database object.

### Step 4: Identify Key Links

"Where is this most likely to break?" Critical connections where breakage causes cascading failures.

| From | To | Via | Risk |
| --- | --- | --- | --- |
| Input | API | `fetch` in onSubmit | Handler not wired |
| API | Database | query call | Query returns static, not DB result |
| Component | Real data | effect fetch | Shows placeholder, not messages |

For UI PRDs add UX failure links:
- Destructive action → confirmation/undo (dialog, toast, action log)
- Form field → validation message (aria-describedby / focus)
- Async action → loading/recovery (button state, toast, banner)
- Filtered data → empty/no-results (query state + empty copy)

## Phase 4: Decompose with Context Budget

**Quality Degradation Rule:** target ~50% context per execution. More plans, smaller scope = consistent quality.

| Task Complexity | Max Tasks | Context/Task | Total |
| --- | --- | --- | --- |
| Simple (CRUD) | 3 | ~10-15% | ~30-45% |
| Complex (auth) | 2 | ~20-30% | ~40-50% |
| Very complex | 1-2 | ~30-40% | ~30-50% |

**Split signals (create child plans):**
- More than 3 tasks
- Multiple subsystems (DB + API + UI)
- Any task with >5 file modifications
- Checkpoint + implementation in same plan
- Discovery + implementation in same plan

Assess size to determine plan structure:

| Size | Files | Approach |
| --- | --- | --- |
| S (1-3 files) | 2-4 tasks | Single plan, no phases |
| M (3-8 files) | 5-8 tasks | 2-3 phases |
| L (8+ files) | 9+ tasks | Split into separate plans per subsystem |

## Phase 5: Dependency Graph & Wave Assignment

**For each task, record:**
- `needs`: what must exist before this runs
- `creates`: what this produces
- `has_checkpoint`: requires user interaction?

**Example:**
```
Task A (User model): needs nothing, creates src/models/user.ts
Task B (User API): needs Task A, creates src/api/users.ts
Task C (User UI): needs Task B, creates src/components/UserList.tsx

Wave 1: A (independent)
Wave 2: B (depends on A)
Wave 3: C (depends on B)
```

## Phase 6: Write the Plan (output contract)

Render the plan from `.pi/templates/project.md` into `.pi/work/$(cat .pi/work/.active)/plan.md` with:
- goal (one sentence)
- constraints (hard vs soft)
- phases with task lists, each task `[action] → verify with [check]`
- dependencies (needs/creates)
- verification for the whole plan
- risks and failure behavior
- privacy/security notes
- open questions marked `[UNCERTAIN: ...]`

Plans are advisory, not directive: the build executor uses the plan as a starting point, then does independent investigation before acting.

## Prewalk boundary

Research and planning are read-only. Before writing the plan file, call
`prewalk.checklist({ ... })` inside fabric_exec with the matching disposition:
`trivial: true` for one or two small edits, `easy: true` plus 2-4 items and
Schema for bounded work, or 5-9 items plus Schema for full work; every
items-bearing checklist requires the Schema contract. Wait for accepted handoff,
then write as the executor. Mark completed items `[DONE:n]`. If acceptance is
denied or scope changes, do not mutate.

## Related Commands

| Need | Command |
| --- | --- |
| Create the spec first | `/create` |
| Implement the plan | `/ship` |
| Verify gates | `/verify` |
