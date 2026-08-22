#!/usr/bin/env node
// Aider graph scope probe: guards the approved live-graph inventory.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = root + ".pi/work/foundations-deep-farm/aider-scope.json";
const refsPath = root + ".pi/skills/pack-foundations/aider-foundation/references/";
const requiredCapsules = new Set(["architect-handoff.md", "collab.md", "context-orchestration.md", "diagnostic-feedback.md", "edit-admission.md", "edit-formats.md", "git-safety.md", "model-policy.md", "repomap.md", "ux.md"]);
const allowed = new Set(["mined", "subsumed", "omitted"]);
let failures = 0;
const fail = (message) => { failures++; console.log("FAIL " + message); };
if (!existsSync(manifestPath)) fail("missing Aider scope manifest");
else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.productionCount !== 80 || manifest.production.length !== 80) fail("production inventory must contain 80 modules");
  else console.log("PASS 80 production modules");
  if (manifest.testCount !== 41 || manifest.tests.length !== 41) fail("test inventory must contain 41 modules");
  else console.log("PASS 41 test modules");
  const paths = new Set();
  for (const item of manifest.production) {
    if (!item.path?.startsWith("aider/") || !item.path.endsWith(".py")) fail("invalid production path: " + item.path);
    if (paths.has(item.path)) fail("duplicate production path: " + item.path);
    paths.add(item.path);
    if (!allowed.has(item.disposition)) fail("invalid disposition for " + item.path);
    if (!item.test?.startsWith("tests/")) fail("missing direct-test anchor for " + item.path);
    if (item.disposition === "omitted" ? !item.reason : !item.capsule) fail("missing disposition evidence for " + item.path);
    if (item.capsule && (!requiredCapsules.has(item.capsule) || !existsSync(refsPath + item.capsule))) fail("invalid capsule for " + item.path + ": " + item.capsule);
  }
  if (new Set(manifest.tests).size !== 41 || manifest.tests.some((p) => !p.startsWith("tests/") || !p.endsWith(".py"))) fail("test inventory is not unique Python paths");
  const mined = manifest.production.filter((m) => m.disposition === "mined").length;
  console.log("PASS disposition evidence; mined seams=" + mined);
}
console.log(failures ? `Aider graph scope probe: FAIL (${failures})` : "Aider graph scope probe: all pass");
process.exit(failures ? 1 : 0);
