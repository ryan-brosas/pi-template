#!/usr/bin/env node
// Foundation squeeze structural probe (leaf-shape contract).
// Enforces the reusable routing surface every foundation must have: a Capsule
// map grouped by capability, an Extending-the-foundation recipe, graph
// provenance/full-view, and map-to-reference parity. Reference-level capsule
// depth is enforced by validate-foundation-depth.mjs and tracked as debt there.
// Live graph state and RED/GREEN pressure results stay as evidence in the
// durable work record because CI cannot call host MCPs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const foundationsDir = join(root, ".pi", "skills", "pack-foundations");
let failures = 0;
let checked = 0;

for (const entry of readdirSync(foundationsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory() || entry.name === "foundations-workflow") continue;
  const leafDir = join(foundationsDir, entry.name);
  const leafPath = join(leafDir, "SKILL.md");
  if (!existsSync(leafPath)) continue;
  checked++;
  const text = readFileSync(leafPath, "utf8");
  const problems = [];
  if (!text.includes("## Capsule map") && !text.includes("## Capability/source map")) problems.push("missing ## Capsule map");
  if (!/^#{2,3} Extending the foundation$/m.test(text)) problems.push("missing Extending the foundation recipe");
  if (!/## Full view \(memory graph\)|Codebase Memory project|Indexed in Codebase Memory/i.test(text)) problems.push("missing graph provenance/full-view");

  // Map-to-reference parity: every references/<file>.md cited must exist; every
  // real file in references/ must have a matching map/action bullet in the leaf.
  const refsDir = join(leafDir, "references");
  const cited = [...text.matchAll(/`(references\/[^`*]+\.md)`/g)].map((m) => m[1]);
  for (const ref of cited) if (!existsSync(join(leafDir, ref))) problems.push("cites missing " + ref);
  if (existsSync(refsDir)) {
    for (const ref of readdirSync(refsDir).filter((n) => n.endsWith(".md") && n !== "DEEP.md")) {
      const bare = "references/" + ref;
      if (!text.includes("references/" + ref)) problems.push("orphan reference not cited in SKILL.md: " + bare);
    }
  }

  if (problems.length) { failures++; console.log("FAIL " + entry.name + ": " + problems.join("; ")); }
  else console.log("PASS " + entry.name);
}
console.log(failures ? `foundation squeeze probe: FAIL (${failures}/${checked} leaves)` : `foundation squeeze probe: all pass (${checked} leaves)`);
process.exit(failures ? 1 : 0);