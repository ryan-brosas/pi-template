# State

## Current Position

- **Date:** 2026-08-09
- **Project:** `ryan-brosas/pi-template`
- **Phase:** Phase 1 — Stable Core
- **Status:** In progress
- **Active focus:** Complete the Pi-native repository simplification and establish detailed initialization context.
- **Primary success criterion:** Stability
- **Primary users:** Developers

No issue tracker or active bead is configured. Do not invent issue IDs. This file uses roadmap phases and concrete next actions until a tracker is explicitly adopted. Evidence: user answers recorded in MEMORY.md and user.md.

## Working Tree Context

- The checked-out branch is `main`, tracking `origin/main`.
- The working tree contains extensive edits that predate initialization:
  - Deleted package manifests, lockfiles, scripts, tests, documentation, MCP examples, skill packs, and workflow files
  - Modified README, `.gitignore`, `.pi/fabric.json`, and several prompt templates
  - A simplified current tree centered on AGENTS.md, README.md, and `.pi/`
- Treat these changes as an active cleanup owned by the user or another agent. Initialization must not restore, stage, revert, or rewrite them.
- Environment facts: Node.js v26.5.0 is available for the validation scripts (host tool, not a project dependency).

## Verification State

| Gate | Command | Last result | Date |
| --- | --- | --- | --- |
| Skill packs | `node scripts/validate-skill-packs.mjs` | pass, packs=10 leaves=80 visible=14 | 2026-08-09 |
| Manifest parity | `node scripts/sync-skill-manifest.mjs --check` | pass | 2026-08-09 |
| Routing probes | `node scripts/probe-skill-routing.mjs` | pass, all probes | 2026-08-09 |
| Whitespace (changed files) | `git diff --check` | pass | 2026-08-09 |

**Pending checks:** fresh-clone smoke procedure and README command audit are next; no CI enforces the gates on a clone.

## Recent Completed Work

| Date | Work | Evidence |
| --- | --- | --- |
| 2026-08-09 | Shipped progressive-disclosure skill packs | 12 visible skills (8 routers + 4 core), 58 hidden leaves, validator green, metadata 1,962 chars (~491 tokens) at that time; since extended to 10 packs and 80 leaves |
| 2026-08-09 | Gathered user identity and workflow preferences | Authenticated GitHub CLI profile plus explicit user answers |
| 2026-08-09 | Completed deep repository detection | Manifest, tool, CI, AI-rule, structure, Git-history, and codemap probes |
| 2026-08-09 | Approved full initialization | User approved detailed core, context, and profile artifacts |
| 2026-08-09 | Mapped inspiration repository availability | CGC absolute context `/home/ryanj/work/inspo/opencode-template` queried successfully; shorthand context unavailable |
| 2026-08-09 | Deep init completed with detailed artifacts | AGENTS.md architecture, project.md, tech-stack.md, roadmap, state, and user files enriched; gates green |

## Active Decisions

| Date | Decision | Rationale | Impact | Evidence |
| --- | --- | --- | --- | --- |
| 2026-08-09 | Position the repository as a clonable pi.dev template inspired by `inspo/opencode-template` | Explicit user direction | Product vision, roadmap, and future comparison work | User answers |
| 2026-08-09 | Target developers | Explicit user choice | Documentation and defaults optimize for developer onboarding | User answers |
| 2026-08-09 | Prioritize stability | Explicit user choice | Safety, consistency, and drift detection outrank feature breadth | User answers |
| 2026-08-09 | Keep the active product Pi-native and Ultra Fabric-focused | README and current tree | Do not reintroduce OpenCode runtime layers without a separate decision | README.md:33-35 |
| 2026-08-09 | Keep the template install-free | README states no build, dependencies, runtime harness, or package manifest | New tooling must not silently add a consumer install step | README.md:9-12 |
| 2026-08-09 | Use detailed AI responses | Explicit user choice | Explanations should include evidence, constraints, and verification detail | User answers |
| 2026-08-09 | Use auto-commit as the user's general Git preference | Explicit user choice | Agents may commit completed scoped work; they must still avoid unrelated changes and respect explicit task constraints | User answers |
| 2026-08-09 | Preserve the current dirty worktree | Multi-agent safety and observed status | Stage only declared files if a later task creates a commit | git status, AGENTS.md Multi-Agent Safety |
| 2026-08-09 | Organize skills as progressive-disclosure packs | Reduce always-visible skill metadata from ~3,362 to ~491 tokens while keeping direct `/skill:leaf` invocation | Eight pack routers, four visible core skills, hidden leaves, `packs.json` catalog, validator gate; now 10 packs and 80 leaves | packs.json, manifest.json, validator |

## Current Architecture

This is a configuration product rather than an application:

1. `AGENTS.md` defines repository-wide agent behavior.
2. `.pi/settings.json` configures Pi runtime preferences.
3. `.pi/fabric.json` configures prewalk safeguards.
4. `.pi/prompts/` exposes user-facing workflows as slash commands.
5. `.pi/skills/` provides task-specific guidance loaded on demand.
6. `.pi/templates/` defines reusable output artifacts.
7. `.pi/roadmap.md`, `.pi/state.md`, and `.pi/user.md` provide optional on-demand context.
8. `.pi/MEMORY.md` and per-work dotfiles store ignored local decisions and working memory.

There is no source-code execution graph, data layer, UI, deployment target, or CI pipeline in the current tree. The full architecture record lives in `.pi/project.md`.

## Risks and Blockers

| Risk or blocker | Severity | Current handling |
| --- | --- | --- |
| Large uncommitted cleanup can be overwritten or accidentally staged | High | Treat all pre-existing changes as protected; use scoped edits and staging |
| README and active tree can drift during simplification | High | Re-run structural inventory before release claims |
| Historical validation suite is deleted | Medium | Use structural inspections now; decide the future verification approach in Phase 2 |
| No documented Pi/Ultra Fabric compatibility policy | Medium | Defer to Phase 4 after the stable core is settled |
| Upstream inspiration can cause indiscriminate feature copying | Medium | Require a feature matrix and Pi-native rationale in Phase 3 |
| `.pi/MEMORY.md` and per-work dotfiles are ignored and local-only | Low | Keep durable shared decisions in tracked docs; use MEMORY.md only for local agent context |

## Open Questions

| Question | Context | Blocking | Roadmap phase |
| --- | --- | --- | --- |
| Which deleted scripts/tests are intentionally retired versus awaiting replacement? | Determines the final stable tree and verification gate | Yes for Phase 1 completion | Phase 1 |
| What minimum Pi and Ultra Fabric versions are supported? | Needed for reliable release claims | No | Phase 4 |
| Should the repository gate require Node, use another available runtime, or remain shell-only? | Affects the install-free promise | No | Phase 2 |
| Which OpenCode-template capabilities have direct Pi equivalents? | Prevents redundant wrappers and guides selective ports | No | Phase 3 |
| Should user profiles and planning context remain ignored/local or be shared by default? | Affects clone behavior and privacy | No | Phase 1 |

## Context Notes

### Technical

- Progressive-disclosure packs keep visible skill metadata under the 1,200-token budget; current use is 2,262 chars (~566 tokens).
- The three Node gates are dependency-free and run on plain Node.

### Product

- The template is a product surface: prompts, skills, templates, and settings.
- Stability is the primary success criterion; feature breadth is secondary.

### Process

- Prewalk with an accepted Schema contract is the sole mutation authority.
- Dirty-repository work requires scoped staging and diff review before any commit.

## Next Actions

1. [ ] Review the final initialization diff and confirm no unrelated path changed.
2. [ ] Decide which current deletions form the intended stable baseline.
3. [ ] Run `/research` to produce a detailed architecture and drift analysis of the simplified tree.
4. [ ] Use `/plan` for the next Phase 1 implementation slice after the deletion decisions are explicit.
5. [ ] Define a minimal fresh-clone smoke procedure before declaring Phase 1 complete.

## Session Handoff

- **Last session:** 2026-08-09 initialization
- **Next-session priority:** Determine the intended final cleanup boundary, then plan the smallest stability-focused validation slice.
- **Known issue:** The working tree was already heavily modified before initialization; status output alone does not identify ownership.
- **Read first:** `AGENTS.md`, `.pi/roadmap.md`, `.pi/state.md`, `.pi/tech-stack.md`, relevant prompt or skill files, then scoped Git diff.
- **Reference context:** `/home/ryanj/work/inspo/opencode-template` is available through CGC; the shorthand `inspo/opencode-template` is not registered.

---

_Update this file after significant decisions, phase transitions, or session handoffs. Keep observed facts separate from planned work._