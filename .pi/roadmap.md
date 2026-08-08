# Roadmap

## Project Direction

### Vision

Provide a clonable pi.dev project template inspired by `inspo/opencode-template`, adapted for Pi and Ultra Fabric. A developer should be able to clone the repository, trust it in Pi, reload the project configuration, run `/init`, and begin work without installing a package runtime or assembling an agent workflow from scratch.

### Primary Users

Developers who use Pi for software projects and want a stable, reusable starting point with:

- Project-local prompt commands
- Portable task skills
- Consistent context artifacts
- Explicit mutation safeguards
- Useful defaults that remain easy to customize

### Primary Success Criterion

**Stability.** The template succeeds when its documented setup path is reliable, its prompts and skills agree on workflow rules, unsafe or undeclared mutations are blocked, generated context remains accurate, and cloning does not require hidden dependencies.

### Supporting Product Principles

1. **Clone and start:** no package installation or runtime harness is required.
2. **Pi-native behavior:** use Pi and Ultra Fabric directly instead of retaining OpenCode runtime layers.
3. **Evidence-backed guidance:** commands and project constraints must come from repository facts.
4. **Safe mutation:** prewalk and Schema contracts remain the progression authority.
5. **Portable customization:** developers can add prompts, skills, templates, and settings without understanding an application framework.
6. **Low drift:** documentation, manifests, and templates should describe the current repository rather than historical structure.

## Roadmap Overview

| Phase | Goal | Status | Stability outcome |
| --- | --- | --- | --- |
| 1. Stable Core | Establish a coherent, clone-ready Pi template and finish the current simplification | In Progress | One documented setup path with no stale runtime assumptions |
| 2. Contract Verification | Add lightweight checks for prompts, skills, templates, and prewalk contracts | Not Started | Repository drift and malformed artifacts fail early |
| 3. Reference Parity | Compare high-value ideas from `inspo/opencode-template` and port only Pi-aligned behavior | Not Started | Useful upstream ideas without OpenCode coupling |
| 4. Release Readiness | Document versioning, compatibility, and repeatable clone validation | Not Started | New clones work predictably across supported Pi environments |

## Phase 1: Stable Core

**Goal:** Finish the Pi-native simplification and make the repository internally consistent as a no-install, clonable template.

### Success Criteria

- [ ] README, prompts, skills, templates, and settings describe the same project layout.
- [ ] `/init` creates detailed AGENTS.md, tech-stack, roadmap, state, user-profile, and local memory artifacts without overwriting prior user content.
- [ ] The mutation boundary is documented consistently in AGENTS.md and mutating prompt templates.
- [ ] Removed package-runtime, OpenCode wrapper, and obsolete validation references do not remain in active guidance.
- [ ] A clean clone can follow the README setup sequence without installing dependencies.
- [ ] Existing user-authored and concurrent work is preserved during initialization.

### Work Areas

| Work area | Outcome | Evidence when complete |
| --- | --- | --- |
| Initialization | Idempotent core, context, and user-profile generation | Repeated `/init --all` preserves existing roadmap/state/user files unless overwrite is approved |
| Prompt consistency | Every mutating command uses prewalk; read-only commands remain read-only | Prompt audit lists each command and mutation policy |
| Skill catalog | Manifest and directory contents agree | Skill count and manifest comparison pass |
| Documentation | README layout and command catalog match the tree | Structural documentation audit has no stale paths |
| Cleanup | Historical runtime files are either deliberately retained or removed with documented rationale | Final scoped Git diff and repository inventory |

### Out of Scope

- Adding an application framework, package manager, database, UI, or deployment target
- Recreating OpenCode plugins that Pi or Ultra Fabric already supplies
- Adding features solely because the inspiration repository contains them
- Publishing a release before the current cleanup and verification approach are settled

## Phase 2: Contract Verification

**Goal:** Provide a small, dependency-light verification layer for the template's public contracts.

### Success Criteria

- [ ] Validate prompt frontmatter, command naming, and required prewalk language.
- [ ] Validate skill frontmatter, unique skill names, and manifest parity.
- [ ] Validate all template files for unresolved placeholders where placeholders are not expected.
- [ ] Validate `.pi/fabric.json` and `.pi/settings.json` against documented supported values.
- [ ] Verify README command and layout claims against the filesystem.
- [ ] Provide one repository gate that returns a nonzero exit code on contract drift.
- [ ] Keep verification optional for consumers who only clone and use the template.

### Design Questions

- Can the gate use only a runtime that ships with the expected Pi environment?
- Should validation scripts live in the repository when the product promise says no package install is needed?
- Which checks protect stable public contracts, and which would only lock in incidental formatting?

### Dependencies

- Phase 1 repository structure and deletion decisions must be complete.
- The supported Pi environment and minimum runtime assumptions must be documented.

## Phase 3: Reference Parity

**Goal:** Evaluate `inspo/opencode-template` as a design reference and port only capabilities that improve the Pi-native template.

The local CGC context at `/home/ryanj/work/inspo/opencode-template` is registered and queryable. The shorthand context `inspo/opencode-template` is not registered; use the absolute context path for future comparisons.

### Success Criteria

- [ ] Maintain a feature matrix: upstream capability, Pi equivalent, decision, rationale, and verification.
- [ ] Prefer Pi core or Ultra Fabric behavior over compatibility wrappers.
- [ ] Port a feature only when it serves the developer audience and stability goal.
- [ ] Record deliberate omissions so future work does not repeatedly rediscover them.
- [ ] Keep upstream provenance clear without copying unrelated runtime code.

### Candidate Reference Areas

- Session summaries and durable handoff context
- Skill discovery, manifests, and invocation ergonomics
- Diagnostics that detect stale, unused, or low-quality project content
- Specification and test-driven workflow guidance
- Browser and external-service skill organization

### Explicit Non-Goals

- Byte-for-byte parity with OpenCode
- OpenCode plugin runtime compatibility
- Vendoring the inspiration repository into this project
- Coupling the template to one model provider

## Phase 4: Release Readiness

**Goal:** Make releases and fresh-clone verification predictable for maintainers and consumers.

### Success Criteria

- [ ] Document supported Pi and Ultra Fabric versions or a clear latest-compatible policy.
- [ ] Define a release checklist covering clean clone, `/trust`, `/reload`, `/init`, and one representative workflow.
- [ ] Verify no secrets, local artifacts, or machine-specific paths ship.
- [ ] Document upgrade guidance for existing clones with customized AGENTS.md and `.pi/` content.
- [ ] Establish a concise changelog or release-note convention.
- [ ] Confirm GitHub repository description and README accurately state the current release promise.

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

---

_Update this roadmap when a phase changes status or the product direction changes. Use `/plan` to create an implementation plan for the active phase._
