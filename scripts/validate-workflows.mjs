import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();
const WORKFLOWS = ["workflow-lifecycle", "workflow-deep-research", "workflow-audit", "workflow-batch-implement", "workflow-gc"];
const ROLES = ["scout", "explore", "plan", "build", "review"];

export function main() {
  const errors = [];
  const skillsDir = join(root, ".pi", "skills");
  const dirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, "SKILL.md"))).sort() : [];
  for (const want of WORKFLOWS) if (!dirs.includes(want)) errors.push("missing workflow skill: " + want);
  const reports = [];
  for (const want of WORKFLOWS) {
    if (!dirs.includes(want)) continue;
    const text = readFileSync(join(skillsDir, want, "SKILL.md"), "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) errors.push(want + ": missing frontmatter");
    else {
      if (!fm.name) errors.push(want + ": frontmatter name required");
      if (!fm.description) errors.push(want + ": frontmatter description required");
    }
    const body = text.toLowerCase();
    if (!body.includes("prewalk")) errors.push(want + ": must declare prewalk authority");
    if (!body.includes("read-only")) errors.push(want + ": must state role read-only boundaries");
    reports.push(want);
  }
  const lifecycle = dirs.includes("workflow-lifecycle") ? readFileSync(join(skillsDir, "workflow-lifecycle", "SKILL.md"), "utf8").toLowerCase() : "";
  for (const role of ROLES) if (!lifecycle.includes(role)) errors.push("workflow-lifecycle must define role " + role);
  if (errors.length > 0) return { ok: false, message: "workflows: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "workflows: OK — " + WORKFLOWS.length + " contracts with role boundaries\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
