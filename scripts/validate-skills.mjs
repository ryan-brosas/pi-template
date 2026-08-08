import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const EXPECTED = ["research", "implementation", "testing", "review"];
const EVIDENCE = ["goal-backward evidence", "acceptance evidence", "behavioral evidence", "structural evidence"];
const FORBIDDEN = ["skip the checklist", "ignore the checklist", "bypass the checklist", "may bypass prewalk"];

export function main() {
  const errors = [];
  const skillsDir = join(root, ".pi", "skills");
  const dirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, "SKILL.md"))).sort() : [];
  for (const want of EXPECTED) if (!dirs.includes(want)) errors.push("missing skill dir: " + want);
  const reports = [];
  for (const dir of dirs) {
    const text = readFileSync(join(skillsDir, dir, "SKILL.md"), "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!fm) {
      errors.push(dir + ": missing frontmatter");
      continue;
    }
    const meta = {};
    for (const line of fm[1].split("\n")) {
      const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
      if (m) meta[m[1]] = m[2];
    }
    if (!meta.name) errors.push(dir + ": frontmatter name required");
    if (!meta.description || !String(meta.description).trim()) errors.push(dir + ": frontmatter description required");
    const bodyLower = text.slice(fm[0].length).toLowerCase();
    if (!bodyLower.includes("prewalk")) errors.push(dir + ": body must mention prewalk");
    if (!bodyLower.includes("checklist")) errors.push(dir + ": body must mention checklist");
    if (!EVIDENCE.some((e) => bodyLower.includes(e))) errors.push(dir + ": body must include a required evidence phrase");
    for (const f of FORBIDDEN) if (bodyLower.includes(f)) errors.push(dir + ": forbidden bypass phrase: " + f);
    reports.push(dir + " (name=" + meta.name + ", description=" + String(meta.description).slice(0, 48) + ")");
  }
  if (errors.length > 0) return { ok: false, message: "skills: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "skills: OK — " + dirs.length + " lifecycle-aware skills\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
