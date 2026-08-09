// Ultra Fabric contract gate: pins prewalk dispositions, Schema requirement,
// runtime configuration, DONE marker contract, and referenced skill paths.
// Usage: node scripts/validate-ultra-fabric.mjs [root]
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("..", import.meta.url));
let failures = 0;
const ok = (m) => console.log("[ok] " + m);
const fail = (m) => { failures++; console.log("[fail] " + m); };

// 1. Runtime configuration (.pi/fabric.json)
const fabricPath = join(root, ".pi", "fabric.json");
if (!existsSync(fabricPath)) fail("missing .pi/fabric.json");
else {
  let cfg;
  try { cfg = JSON.parse(readFileSync(fabricPath, "utf8")); } catch (e) { fail("fabric.json is not valid JSON: " + e.message); }
  if (cfg) {
    const p = cfg.prewalk || {};
    if (p.verificationMode === "gated") ok("prewalk.verificationMode = gated"); else fail("prewalk.verificationMode must be gated, got " + p.verificationMode);
    if (p.arm === "task") ok("prewalk.arm = task"); else fail("prewalk.arm must be task, got " + p.arm);
    if (p.maxPhaseRevisions === 2) ok("prewalk.maxPhaseRevisions = 2"); else fail("prewalk.maxPhaseRevisions must be 2, got " + p.maxPhaseRevisions);
    if (typeof p.model === "string" && p.model.length > 0) ok("prewalk.model configured"); else fail("prewalk.model must be a nonempty string");
  }
}

// 2. Native disposition contract in AGENTS.md
const agentsPath = join(root, "AGENTS.md");
if (!existsSync(agentsPath)) fail("missing AGENTS.md");
else {
  const agents = readFileSync(agentsPath, "utf8");
  for (const [label, needle] of [["trivial disposition", "trivial: true"], ["easy disposition", "easy: true"], ["full 5-9 items", "5-9"], ["easy 2-4 items", "2-4"], ["DONE marker", "[DONE:n]"], ["Schema requirement", "schema"]]) {
    if (agents.includes(needle)) ok("AGENTS.md: " + label); else fail("AGENTS.md missing " + label);
  }
}

// 3. Mutating prompts: no stale blanket cardinality; dispositions present
for (const name of ["create", "fix", "init", "plan", "ship"]) {
  const file = join(root, ".pi", "prompts", name + ".md");
  if (!existsSync(file)) { fail("missing .pi/prompts/" + name + ".md"); continue; }
  const text = readFileSync(file, "utf8");
  if (text.includes("5-9 ordered items")) fail(name + ": stale blanket 5-9 wording remains");
  else ok(name + ": no stale 5-9-only wording");
  for (const [label, needle] of [["prewalk call", "prewalk.checklist("], ["trivial disposition", "trivial: true"], ["easy disposition", "easy: true"], ["do not mutate", "do not mutate"]]) {
    if (text.includes(needle)) ok(name + ": " + label); else fail(name + " missing " + label);
  }
}

// 4. ship.md skill references must resolve to real files
const shipPath = join(root, ".pi", "prompts", "ship.md");
if (existsSync(shipPath)) {
  const ship = readFileSync(shipPath, "utf8");
  if (ship.includes(".pi/skills/test-driven-development/SKILL.md")) fail("ship.md references the moved TDD path");
  else ok("ship.md does not reference the moved TDD path");
  for (const ref of [".pi/skills/pack-delivery/test-driven-development/SKILL.md", ".pi/skills/verification-before-completion/SKILL.md"]) {
    if (ship.includes(ref) && existsSync(join(root, ref))) ok("ship.md skill exists: " + ref);
    else fail("ship.md skill missing or not referenced: " + ref);
  }
}

console.log(failures ? "ultra-fabric contract: FAIL" : "ultra-fabric contract: ok");
process.exit(failures ? 1 : 0);
