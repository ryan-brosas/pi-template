# Roadmap

## Project Direction

### Vision

Provide a clonable pi.dev project template inspired by `inspo/opencode-template`, adapted for Pi and Pi Fabric. A developer should be able to clone the repository, trust it in Pi, reload the project configuration, run `/init`, and begin work without installing a package runtime or assembling an agent workflow from scratch.

### Primary Users

Developers who use Pi for software projects and want a stable, reusable starting point with:

- Project-local prompt commands
- Portable task skills
- Consistent context artifacts
- Explicit mutation safeguards
- Useful defaults that remain easy to customize

### Primary Success Criterion

**Stability.** The template succeeds when its documented setup path is reliable, its prompts and skills agree on workflow rules, unsafe or undeclared mutations are blocked, generated context remains accurate, and cloning does not require hidden dependencies. Evidence: explicit user choice, recorded in MEMORY.md and state.md Active Decisions.

### Supporting Product Principles

1. **Clone and start:** no package installation or runtime harness is required.
2. **Pi-native behavior:** use Pi and Pi Fabric directly instead of retaining OpenCode runtime layers.
3. **Evidence-backed guidance:** commands and project constraints must come from repository facts.
4. **Safe mutation:** the Schema commit loop remains the progression authority.
5. **Portable customization:** developers can add prompts, skills, templates, and settings without understanding an application framework.
6. **Low drift:** documentation, manifests, and templates should describe the current repository rather than historical structure.

## Roadmap Overview

| Phase                    | Goal                                                                                      | Outcome                                                      | Status      | Depends on   |
|--------------------------|-------------------------------------------------------------------------------------------|--------------------------------------------------------------|-------------|--------------|
| 1. Stable Core           | Establish a coherent, clone-ready Pi template and finish the current simplification       | One documented setup path with no stale runtime assumptions  | In Progress | Current tree |
| 2. Contract Verification | Add lightweight checks for prompts, skills, templates, and Schema contracts               | Repository drift and malformed artifacts fail early          | Not Started | Phase 1      |
| 3. Reference Parity      | Compare high-value ideas from `inspo/opencode-template` and port only Pi-aligned behavior | Useful upstream ideas without OpenCode coupling              | Not Started | Phase 1      |
| 4. Release Readiness     | Document versioning, compatibility, and repeatable clone validation                       | New clones work predictably across supported Pi environments | Not Started | Phases 1-3   |

## Phase 1: Stable Core

**Goal:** Finish the Pi-native simplification and make the repository internally consistent as a no-install, clonable template.

**Outcomes:** observable when this phase is done.

- [ ] A clean clone follows the README setup sequence without installing dependencies.
- [ ] Repeated `/init` runs produce detailed artifacts and preserve existing user content.
- [ ] The mutation boundary is documented consistently in AGENTS.md and every mutating prompt.

**Success Criteria:**

- [ ] README, prompts, skills, templates, and settings describe the same project layout.
- [ ] `/init` creates detailed AGENTS.md, tech-stack, roadmap, state, user-profile, and local memory artifacts without overwriting prior user content.
- [ ] The mutation boundary is documented consistently in AGENTS.md and mutating prompt templates.
- [ ] Removed package-runtime, OpenCode wrapper, and obsolete validation references do not remain in active guidance.
- [ ] A clean clone can follow the README setup sequence without installing dependencies.
- [ ] Existing user-authored and concurrent work is preserved during initialization.

**Work Areas:**

| Work area          | Outcome                                                                                        | Evidence when complete                                                                                                  |
|--------------------|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Initialization     | Idempotent core, context, and user-profile generation                                          | Repeated `/init --all` preserves existing roadmap/state/user files unless overwrite is approved                         |
| Prompt consistency | Every mutating command uses the Schema loop; read-only commands remain read-only               | Prompt audit lists each command and mutation policy                                                                     |
| Skill catalog      | Pack catalog, ledger, and frontmatter agree                                                    | `node scripts/validate-skill-packs.mjs` exits 0; 10 packs, 88 leaves, 14 visible, metadata under the 1,200-token budget |
| Documentation      | README layout and command catalog match the tree                                               | Structural documentation audit has no stale paths                                                                       |
| Cleanup            | Historical runtime files are either deliberately retained or removed with documented rationale | Final scoped Git diff and repository inventory                                                                          |

**Dependencies:**

- Current repository structure and deletion decisions must be explicit before Phase 2 begins.
- Documented minimum Pi and Pi Fabric versions are deferred to Phase 4.

**Risks:**

- Large uncommitted cleanup can be overwritten or accidentally staged; handled by scoped edits and staging, never blanket staging.
- Historical counts in generated artifacts can drift; regenerated tech-stack.md reconciles them.

**Non-Goals (Out of Scope):**

- Adding an application framework, package manager, database, UI, or deployment target
- Recreating OpenCode plugins that Pi or Pi Fabric already supplies
- Adding features solely because the inspiration repository contains them
- Publishing a release before the current cleanup and verification approach are settled

## Phase 2: Contract Verification

**Goal:** Provide a small, dependency-light verification layer for the template's public contracts.

The skill-pack gate (`scripts/validate-skill-packs.mjs`) already covers catalog membership, visibility, and metadata budget; remaining Phase 2 scope is prompts, templates, and configuration checks.

**Outcomes:**

- [ ] Drift in prompts, templates, or config values fails a local gate with a nonzero exit.
- [ ] The gate runs on a runtime already present in the expected Pi environment.

**Success Criteria:**

- [ ] Validate prompt frontmatter, command naming, and required Schema language.
- [ ] Validate skill frontmatter, unique skill names, and manifest parity.
- [ ] Validate all template files for unresolved placeholders where placeholders are not expected.
- [ ] Validate `.pi/fabric.json` and `.pi/settings.json` against documented supported values.
- [ ] Verify README command and layout claims against the filesystem.
- [ ] Provide one repository gate that returns a nonzero exit code on contract drift.
- [ ] Keep verification optional for consumers who only clone and use the template.

**Design Questions:**

- Can the gate use only a runtime that ships with the expected Pi environment?
- Should validation scripts live in the repository when the product promise says no package install is needed?
- Which checks protect stable public contracts, and which would only lock in incidental formatting?

**Dependencies:**

- Phase 1 repository structure and deletion decisions must be complete.
- The supported Pi environment and minimum runtime assumptions must be documented.

**Risks:**

- A gate that requires a package install would violate the install-free promise; kept Node-only and dependency-free.
- Over-validation could lock in incidental formatting; scope checks to stable contracts.

**Non-Goals:**

- A mandatory consumer-side verification step
- A package-manager-based test harness

## Phase 3: Reference Parity

**Goal:** Evaluate `inspo/opencode-template` as a design reference and port only capabilities that improve the Pi-native template.

Codebase Memory MCP lists indexed inspiration repositories. Select one project for `opencode-template` comparisons, verify graph coverage, and confirm exact source through the JetBrains IDE before porting capabilities. Evidence: codebase-memory_list_projects output and state.md session handoff.

**Outcomes:**

- [ ] A maintained feature matrix records upstream capability, Pi equivalent, decision, rationale, and verification.
- [ ] Deliberate omissions are recorded so future work does not rediscover them.

**Success Criteria:**

- [ ] Maintain a feature matrix: upstream capability, Pi equivalent, decision, rationale, and verification.
- [ ] Prefer Pi core or Pi Fabric behavior over compatibility wrappers.
- [ ] Port a feature only when it serves the developer audience and stability goal.
- [ ] Record deliberate omissions so future work does not repeatedly rediscover them.
- [ ] Keep upstream provenance clear without copying unrelated runtime code.

**Candidate Reference Areas:**

- Session summaries and durable handoff context
- Skill discovery, manifests, and invocation ergonomics
- Diagnostics that detect stale, unused, or low-quality project content
- Specification and test-driven workflow guidance
- Browser and external-service skill organization

**Dependencies:**

- An indexed Codebase Memory project for the reference repository with verified graph coverage.
- Phase 1 stable baseline so ports land on settled structure.

**Risks:**

- Indiscriminate feature copying; handled by the feature matrix and Pi-native rationale requirement.

**Non-Goals:**

- Byte-for-byte parity with OpenCode
- OpenCode plugin runtime compatibility
- Vendoring the inspiration repository into this project
- Coupling the template to one model provider

## Phase 4: Release Readiness

**Goal:** Make releases and fresh-clone verification predictable for maintainers and consumers.

**Outcomes:**

- [ ] A documented compatibility policy for Pi and Pi Fabric versions.
- [ ] A release checklist that a maintainer can execute on a clean clone.

**Success Criteria:**

- [ ] Document supported Pi and Pi Fabric versions or a clear latest-compatible policy.
- [ ] Define a release checklist covering clean clone, `/trust`, `/reload`, `/init`, and one representative workflow.
- [ ] Verify no secrets, local artifacts, or machine-specific paths ship.
- [ ] Document upgrade guidance for existing clones with customized AGENTS.md and `.pi/` content.
- [ ] Establish a concise changelog or release-note convention.
- [ ] Confirm GitHub repository description and README accurately state the current release promise.

**Dependencies:**

- Minimum supported versions decided (Open Questions).
- Phase 1 and Phase 2 completion.

**Risks:**

- Compatibility claims without verified versions; every claim must trace to a tested environment.

**Non-Goals:**

- Packaged releases beyond a Git clone (deferred; see Deferred Ideas).

## Prioritization Rules

When roadmap items compete, choose the work that:

1. Prevents unsafe mutation or loss of user work.
2. Removes contradictions from the documented setup path.
3. Detects drift in public prompts, skills, templates, or configuration.
4. Improves a fresh developer's first successful session.
5. Reduces maintenance without adding hidden runtime requirements.

## Deferred Ideas

These ideas need a separate design decision before implementation:

- Optional installer or update command
- Automated source-provenance synchronization
- A compatibility matrix across Pi versions or operating systems
- Packaged releases beyond a Git clone
- Telemetry, analytics, hosted services, or credentialed integrations

## Evidence

Every outcome, criterion, and dependency above traces to a user answer, decision record, or repository fact. Unverified items are marked `[NEEDS CLARIFICATION: reason]`.

---

_Update this file when phases complete or roadmap changes._
_Use `/plan` command to create detailed plans for active phases._
