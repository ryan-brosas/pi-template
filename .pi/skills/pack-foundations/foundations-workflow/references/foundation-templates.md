# Canonical foundation templates

This is the normative, copyable structure for every foundation leaf and every new or substantively rewritten reference. It is the explicit template extracted from the Oh My Pi loader/map layout and its modern `capsule-v2` evidence form—not a loose example. The portable mirrors are `.pi/templates/foundation-skill.md` and `.pi/templates/foundation-capsule.md`; both are template-only library assets, not slash-command render targets.

## Canonical foundation leaf template

```md
---
name: <repo>-foundation
description: "Use when <precise trigger>."
disable-model-invocation: true
---
# <Repository>: <Foundation title>

## Use this for
<one routing paragraph; source and direct tests are ground truth.>

## Load the matching source dump
- `references/<seam>.md` — <one porting question>.

## Capsule map
- **<Capability>** — `<seam>`: <short contract>.

## Extending the foundation
Add one source-confirmed capsule: loader line, map entry, decisive source, invariant, direct-test probe, and `search_graph` retrieval.

## Provenance
<repo/license/revision>; Codebase Memory project <project> (<coverage and caveat>).

## Boundaries
Adopt <contract>; adapt <integration>; omit <source-specific behavior>.
```

The order is fixed. The leaf routes, catalogs, maps, identifies the index, and bounds adoption. It does not duplicate source excerpts, test detail, or a repository census. Every `references/*.md` file must appear once in the loader and map; every loader/map entry must resolve to a file.

## Canonical capsule-v2 reference template

```md
<!-- capsule-v2 -->
# <Seam> — <one porting question>

**Source:** <repo/license/revision>; Codebase Memory `<project>`. **Question:** <question>.

## <seam heading>
**Path/Symbol:** `<path>:<symbol>` (<lines>).
**Signature:** `<signature>`.
**Data Shape:** <inputs/defaults/ownership/output>.

### Decisive source
```<language>
<smallest code excerpt that prevents the likely wrong port>
```

**Flow:** <transition>.
**Invariant:** <must-not-break rule>.
**Probe:** `<direct-test-path>` (<observable boundary>).

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "<project>", query: "<symbol/relationship>", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt <portable behavior>; adapt <host-specific detail>; omit <non-portable behavior>. <State coverage caveat if needed.>
```

Each capsule answers one question. The graph selects the seam; inspected source and a direct test prove it. Never fill the template with a repo-wide sweep, invented coverage, or copied module bodies.
