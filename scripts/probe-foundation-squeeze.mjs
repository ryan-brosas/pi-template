#!/usr/bin/env node
// Foundation squeeze structural probe.
// Enforces the reusable leaf shape; live graph state and RED/GREEN results stay
// as evidence in the durable work record because CI cannot call host MCPs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const foundationsDir = join(root, ".pi", "skills", "pack-foundations");
const fail = (message) => { console.log("FAIL " + message); failures++; };
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
  if (!text.includes("## Capsule map")) problems.push("missing ## Capsule map");
  if (!/^#{2,3} Extending the foundation$/m.test(text)) problems.push("missing Extending the foundation recipe");
  if (!/## Full view \(memory graph\)|Codebase Memory project|Indexed in Codebase Memory/i.test(text)) problems.push("missing graph provenance/full-view");

  const refsDir = join(leafDir, "references");
  // Ignore glob literals such as `references/*.md`; only treat concrete names as cites.
  const cited = [...(text.matchAll(/`(references\/[^`*]+\.md)`/g))].map((m) => m[1]);
  for (const ref of cited) if (!existsSync(join(leafDir, ref))) problems.push("map/catalog cites missing " + ref);
  if (!existsSync(refsDir)) problems.push("missing references directory");
  else for (const ref of readdirSync(refsDir).filter((name) => name.endsWith(".md") && name !== "DEEP.md")) {
    const head = readFileSync(join(refsDir, ref), "utf8").slice(0, 200);
    if (!/<!--\s*capsule-v\d+\s*-->/.test(head)) problems.push("reference lacks a capsule-vN marker: " + ref);
  }

  if (problems.length) fail(entry.name + ": " + problems.join("; "));
  else console.log("PASS " + entry.name);
}
console.log(failures ? `foundation squeeze probe: FAIL (${failures}/${checked} leaves)` : `foundation squeeze probe: all pass (${checked} leaves)`);
process.exit(failures ? 1 : 0);
