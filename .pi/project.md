# Project

Rendered by /init on 2026-08-09 from .pi/templates/project.md. Read on demand for project context; update when architecture or direction changes.

## Purpose and Status

- **Goal:** Give a developer a clonable, dependency-free Pi coding-agent workspace with ready-to-use prompts, skills, templates, settings, and a mutation guard, so a new Pi project starts without setup work.
- **Status:** Polish. The baseline is functional; work is incremental refinement of skills, prompts, and rules.
- **Milestone:** Baseline with 9 slash commands, 80 skills in 10 packs, 11 format templates, and the prewalk guard. Evidence: validator output 2026-08-09 (packs=10, leaves=80, routers=10, visible=14).
- **Next Milestone:** None planned. Direction comes from .pi/roadmap.md, which the user owns.

## Success Criteria

1. A developer clones the repository, trusts it in Pi, reloads, and runs /init to get a complete context artifact set. (Verifiable by following README.md:8-13.)
2. All three structural gates exit 0 on a clean tree: node scripts/validate-skill-packs.mjs, node scripts/sync-skill-manifest.mjs --check, node scripts/probe-skill-routing.mjs. (Verifiable by running them.)
3. Mutating commands defer to the prewalk guard and never touch unrelated working-tree changes. (Verifiable by command behavior and scope checks.)
4. The repository stays clonable with no package install, build, or runtime harness. (Verifiable by README.md:9-12 and the absence of manifests.)

## Target Users

- **Primary:** Developers who want a stable Pi + Ultra Fabric starting point, clone and start.
- **Secondary:** Teams standardizing agent rules, prompts, and skills across Pi projects.
- **Non-goals:** Serving as an application scaffold, a package distribution, or a runtime. (README.md:9-12.)

## Core Principles

1. **Clone and start.** No install step, no hidden dependencies, no build. (README.md:9-12.)
2. **Pi-native surface.** Prompts, skills, templates, and settings are the product. OpenCode runtime wrappers are removed and must not return. (README.md:33-35.)
3. **Prewalk is the mutation authority.** Non-trivial writes require an accepted checklist with a Schema contract. (AGENTS.md Prewalk and Mutation, .pi/fabric.json.)
4. **Generated state stays local.** .pi/artifacts/, .pi/fabric/, and .pi/hindsight/ are gitignored. (README.md:36-37, .gitignore.)

## System Context

- **External actors:** A developer operating Pi in the repository; the prewalk frontier model that reviews checklist proposals.
- **External systems:** The Pi coding-agent runtime, the Ultra Fabric extension, and the Git remote at origin https://github.com/ryan-brosas/pi-template.git. (git remote -v.)
- **Trust boundaries:** No application runtime, so no data boundary exists. Secret policy bans committed credentials (AGENTS.md Constraints table). Prewalk accepts or denies mutation handoffs.
- **Runtime and environment:** Pi host with Ultra Fabric; Node.js v26.5.0 available for the validation scripts (host tool, not a project dependency).

## Architecture Overview

- **Architectural style:** Configuration and documentation template. No source tree, no build, no runtime harness. (README.md:9-12.)
- **Component Responsibilities:**
  - Prompts (.pi/prompts/) - 9 slash commands; each is a self-contained workflow with a Prewalk boundary section.
  - Skills (.pi/skills/) - 80 leaves in 10 packs; catalog in packs.json, ledger in manifest.json; progressive-disclosure visibility.
  - Templates (.pi/templates/) - 11 format templates rendered by /init, /create, and /plan.
  - Settings (.pi/settings.json, .pi/fabric.json) - Pi runtime preferences and Ultra Fabric prewalk configuration.
  - Gates (scripts/) - 3 dependency-free Node validation scripts owned by the template itself.
  - Context artifacts (AGENTS.md, .pi/*.md) - durable product and architecture records.
- **Composition Roots:** No application composition. The Pi host and the /init command are the wiring points: Pi loads .pi/settings.json and .pi/prompts/; /init renders templates into artifacts.
- **Dependency Rules:** Pi host reads .pi/settings.json and .pi/prompts/; Ultra Fabric reads .pi/fabric.json; scripts read .pi/skills/packs.json and manifest.json; /init renders .pi/templates/*.md. No layer imports another; nothing depends on application code because none exists.

## Runtime Entrypoints

No application runtime exists. The operator entrypoints are the slash commands:

| Entrypoint | Kind | Path | Purpose | Config source |
| --- | --- | --- | --- | --- |
| /init | CLI (Pi slash command) | .pi/prompts/init.md | One-time full initialization of context artifacts | .pi/templates/, .pi/fabric.json |
| /create | CLI (Pi slash command) | .pi/prompts/create.md | Spec: PRD, workspace, tasks | .pi/templates/ |
| /plan | CLI (Pi slash command) | .pi/prompts/plan.md | Detailed TDD implementation plan | - |
| /fix | CLI (Pi slash command) | .pi/prompts/fix.md | Debug and fix a bug or failing test | - |
| /ship | CLI (Pi slash command) | .pi/prompts/ship.md | Implement the active spec end to end | - |
| /verify | CLI (Pi slash command) | .pi/prompts/verify.md | Run gates against the spec | - |
| /audit | CLI (Pi slash command) | .pi/prompts/audit.md | Pattern audit with remediation list | - |
| /gc | CLI (Pi slash command) | .pi/prompts/gc.md | Structural scan and cleanup plan | - |
| /research | CLI (Pi slash command) | .pi/prompts/research.md | Evidence references for the prewalk schema | - |

## Request, Data, and Event Flows

- **Primary request flow:** A developer runs a slash command. Pi loads the prompt template from .pi/prompts/. Mutating commands submit a prewalk checklist and, once accepted, the executor writes only declared files.
- **Write and read paths:** /init reads .pi/templates/ and writes AGENTS.md, .pi/project.md, and .pi/tech-stack.md, and creates roadmap, state, and user files only when missing. /create writes spec.md and tasks.md.
- **Background processing:** None.
- **Event publication and consumption:** None.
- **Failure behavior:** A denied prewalk handoff blocks all writes; the executor must not mutate (documented in every mutating prompt's Prewalk boundary section).

## Configuration

- **Configuration sources:** .pi/settings.json (Pi runtime), .pi/fabric.json (Ultra Fabric prewalk: verificationMode, thinking, arm, model), prompt frontmatter, and AGENTS.md rules. On conflict, AGENTS.md rule precedence applies (Rule 0).
- **Secrets:** None in the template; AGENTS.md bans committed credentials and requires runtime env/config reads.
- **Environments:** None; clone-and-start. The repository has no dev/staging/production split.
- **Validation:** .pi/fabric.json and .pi/settings.json values are documented in README and validated by inspection; [NEEDS CLARIFICATION: a schema-level config validator is a Phase 2 roadmap candidate].

## Data Ownership

- **Stores and schemas:** None. No database or data files exist.
- **Cache ownership:** None.
- **Transaction boundaries:** Not applicable.
- **Migration mechanism:** Not applicable.
- **Generated state:** .pi/artifacts/MEMORY.md holds local durable decisions; .pi/fabric/ and .pi/hindsight/ hold runtime state. All three are gitignored and owned by the local runtime. (README.md:36-37.)

## External Integrations

| Service | Auth | Docs | Rate limits | Error handling |
| --- | --- | --- | --- | --- |
| Pi runtime | Local, none | pi coding agent docs | None | N/A |
| Ultra Fabric | Local, none | .pi/fabric.json and ultra-fabric docs | None | Prewalk accepts or denies handoff |
| Git remote origin | HTTPS | github.com/ryan-brosas/pi-template.git | None | None; local repository only |

No external application API, database, deployment provider, or credential-bearing integration exists.

## Deployment Topology

- **Build artifacts:** None.
- **Runtime services:** None.
- **Environments:** None. Clone and start; there is no promotion path.
- **Health checks:** None. The structural gates serve as repository health checks.
- **Rollback path:** Git. The template is a Git repository on branch main with origin at GitHub.

## Testing Architecture

- **Unit, integration, contract, e2e seams:** None. The repository has no application test suite.
- **Test locations:** None in the working tree. Historical tests exist in Git history but were deleted in the current uncommitted cleanup; init does not restore them.
- **Structural gates:** scripts/validate-skill-packs.mjs checks catalog, membership, visibility, and metadata budget. scripts/sync-skill-manifest.mjs --check verifies manifest parity. scripts/probe-skill-routing.mjs checks router dispatch.
- **Coverage gaps:** No automated coverage for prompts, templates, or config values; [NEEDS CLARIFICATION: whether Phase 2 adds prompt/template/config validators is a roadmap question].

## Observability

- **Logging:** Pi and Ultra Fabric runtime logs; none produced by the repository itself.
- **Metrics:** None.
- **Tracing:** None.
- **Alerting:** None. Reproducibility comes from deterministic validation gates and git history.

## Failure Modes

| Failure | Symptom | Detection | Recovery |
| --- | --- | --- | --- |
| Prewalk handoff denied | Mutation blocked | Checklist rejection in fabric_exec | Revise scope, re-submit; do not mutate |
| Skill catalog drift | Validator nonzero | node scripts/validate-skill-packs.mjs | Fix packs.json/manifest.json membership |
| Stale generated counts | Artifacts disagree with tree | Cross-artifact rg checks | Regenerate tech-stack.md and reconcile |
| Accidentally sweeping concurrent work | Out-of-scope files staged | git status, scoped diff review | Unstage only the declared files; never revert others |

## Architectural Invariants

- The repository stays clonable with no package install, manifest, build, or runtime harness. (README.md:9-12.)
- Prewalk with an accepted checklist is the sole authority for non-trivial mutations. (AGENTS.md Prewalk and Mutation.)
- Generated local state (.pi/artifacts/, .pi/fabric/, .pi/hindsight/) is gitignored and never committed. (README.md:36-37.)
- The product surface stays Pi-native. OpenCode runtime wrappers must not return. (README.md:33-35.)
- Skills membership is owned by .pi/skills/packs.json. Adding or moving a skill requires passing node scripts/validate-skill-packs.mjs. (AGENTS.md Skills section.)

## Decisions

| Date | Decision | Rationale | Alternatives | Record |
| --- | --- | --- | --- | --- |
| 2026-08-09 | Deep init creates .pi/project.md and enriches every artifact | Missing architecture record; user asked for detailed init output | Leave project.md missing | MEMORY.md deep-init entry |
| 2026-08-09 | AGENTS.md carries concise operational architecture; project.md carries the detailed record | Instruction budget and progressive disclosure | Full duplication in AGENTS.md | AGENTS.md Architecture section |
| 2026-08-09 | Keep the template install-free with Node validation scripts | README promise: no package install | Shell-only gates | README.md:9-12, roadmap Phase 2 |

## Known Risks and Hotspots

- Large uncommitted working-tree cleanup. Many tracked files are deleted or modified; a careless commit could sweep unrelated work.
- Stale generated counts. A previous tech-stack.md said 62 skills in 8 packs; the catalog now has 80 skills in 10 packs. Regenerate tech-stack.md when the catalog changes.
- No CI. Nothing enforces the structural gates on a clone; the validators must run manually.
- No automated tests. Regressions in prompts or skills surface through manual review and the routing probes.

## Open Questions

| Question | Context | Blocking | Priority |
| --- | --- | --- | --- |
| Branch protection policy | Git config has no push or merge protection | No | Medium |
| Next milestone beyond incremental refinement | Roadmap is user-authored | No | Low |
| Phase 2 validator scope | Prompt/template/config gates are a roadmap candidate | No | Medium |
| Minimum supported Pi/Ultra Fabric versions | Needed for release claims | No | Low |

## Evidence

- README.md:8-13 install flow; README.md:21-37 layout and generated-state boundaries; README.md:39-48 command table; README.md:33-35 removed OpenCode wrappers.
- AGENTS.md Prewalk and Mutation, Skills, Constraints, Architecture sections.
- .pi/settings.json and .pi/fabric.json configuration values.
- scripts/validate-skill-packs.mjs, scripts/sync-skill-manifest.mjs, scripts/probe-skill-routing.mjs, all exit 0 on 2026-08-09.
- git remote -v shows origin at github.com/ryan-brosas/pi-template.git.

---

_Update this file when architecture or project direction changes._
_AI reads this on demand to stay aligned with project goals and invariants._