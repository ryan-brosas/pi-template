#!/usr/bin/env node
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const required = [
  [".pi/skills/pack-foundations/foundations-workflow/SKILL.md", "Graph-led seam selection"],
  [".pi/skills/pack-foundations/foundations-workflow/SKILL.md", "capsule-v2"],
  [".pi/skills/pack-foundations/foundations-workflow/references/quality-bar.md", "Decisive source"],
  [".pi/skills/pack-foundations/foundations-workflow/references/quality-bar.md", "direct test path"],
  ["scripts/validate-foundation-depth.mjs", "CAPSULE_V2_MARKER"],
  ["scripts/validate-foundation-depth.mjs", "decisive-source"],
  [".pi/skills/pack-foundations/foundations-workflow/references/foundation-templates.md", "Canonical foundation leaf template"],
  [".pi/skills/pack-foundations/foundations-workflow/references/foundation-templates.md", "Canonical capsule-v2 reference template"],
  [".pi/templates/foundation-skill.md", "## Load the matching source dump"],
  [".pi/templates/foundation-capsule.md", "<!-- capsule-v2 -->"],
];
let failures = 0;
for (const [path, text] of required) {
  if (read(path).includes(text)) console.log("PASS " + path + " contains " + text);
  else { console.log("FAIL " + path + " missing " + text); failures++; }
}
const workflow = read(".pi/skills/pack-foundations/foundations-workflow/SKILL.md");
if (/Repo sweep|every module is accounted for/i.test(workflow)) {
  console.log("FAIL workflow still requires a repository sweep"); failures++;
} else console.log("PASS workflow does not require a repository sweep");
console.log(failures ? `foundation capsule standard: FAIL (${failures})` : "foundation capsule standard: all pass");
process.exit(failures ? 1 : 0);
