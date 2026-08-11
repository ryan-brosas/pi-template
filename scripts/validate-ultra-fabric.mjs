// Ultra Fabric contract gate: pins Schema enforce dispositions, runtime
// configuration, DONE marker contract, and referenced skill paths.
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
    const s = cfg.schema || {};
    if (s.mode === "enforce") ok("schema.mode = enforce"); else fail("schema.mode must be enforce, got " + s.mode);
    const cc = (s.trustedCommands && s.trustedCommands["canonical-check"]) || {};
    if (cc.command === "node" && Array.isArray(cc.args) && cc.args.join(" ") === "scripts/check.mjs" && cc.shell !== true)
      ok("schema.trustedCommands.canonical-check = node scripts/check.mjs");
    else fail("schema.trustedCommands.canonical-check must run node scripts/check.mjs without a shell");
  }
}

// 2. Schema loop contract in AGENTS.md
const agentsPath = join(root, "AGENTS.md");
if (!existsSync(agentsPath)) fail("missing AGENTS.md");
else {
  const agents = readFileSync(agentsPath, "utf8");
  for (const [label, needle] of [["Schema hypothesize", "schema.hypothesize"], ["Schema verify", "schema.verify"], ["Schema commit", "schema.commit"], ["canonical-check", "canonical-check"], ["DONE marker", "[DONE:n]"]]) {
    if (agents.includes(needle)) ok("AGENTS.md: " + label); else fail("AGENTS.md missing " + label);
  }
}

// 3. Mutating prompts: no stale prewalk wording; Schema loop present
for (const name of ["create", "fix", "init", "plan", "ship"]) {
  const file = join(root, ".pi", "prompts", name + ".md");
  if (!existsSync(file)) { fail("missing .pi/prompts/" + name + ".md"); continue; }
  const text = readFileSync(file, "utf8");
  if (text.includes("prewalk")) fail(name + ": stale prewalk wording remains");
  else ok(name + ": no stale prewalk wording");
  for (const [label, needle] of [["Schema hypothesize", "schema.hypothesize"], ["Schema verify", "schema.verify"], ["Schema commit", "schema.commit"], ["do not mutate", "do not mutate"]]) {
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

// 5. AGENTS template and init prompt: outcome-driven guidance contract
const agentsTemplatePath = join(root, ".pi", "templates", "agents.md");
if (!existsSync(agentsTemplatePath)) fail("missing .pi/templates/agents.md");
else {
  const template = readFileSync(agentsTemplatePath, "utf8");
  for (const needle of ["## Golden rule: check when done", "[verified check command]", "## Safety boundaries", "## Repository invariants", "## Operational traps", "Keep the rendered file short"]) {
    if (template.includes(needle)) ok("agents template: " + needle); else fail("agents template missing " + needle);
  }
}
const initPath = join(root, ".pi", "prompts", "init.md");
if (!existsSync(initPath)) fail("missing .pi/prompts/init.md");
else {
  const initText = readFileSync(initPath, "utf8");
  for (const needle of ["one canonical completion command", "repository-specific invariants", "operational traps", "generic coding doctrine"]) {
    if (initText.includes(needle)) ok("init prompt: " + needle); else fail("init prompt missing " + needle);
  }
}

// 6. This repository exposes one local and CI completion command.
const checkPath = join(root, "scripts", "check.mjs");
if (existsSync(checkPath)) ok("canonical check script exists");
else fail("missing scripts/check.mjs");
const workflowPath = join(root, ".github", "workflows", "check.yml");
if (!existsSync(workflowPath)) fail("missing .github/workflows/check.yml");
else {
  const workflow = readFileSync(workflowPath, "utf8");
  if (workflow.includes("node scripts/check.mjs")) ok("CI runs canonical check");
  else fail("CI does not run node scripts/check.mjs");
}

console.log(failures ? "ultra-fabric contract: FAIL" : "ultra-fabric contract: ok");
process.exit(failures ? 1 : 0);
