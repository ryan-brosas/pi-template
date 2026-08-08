import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();
const MIN_SKILLS = 12;
const SOURCE_ROOTS = ["/home/ryanj/work/projects/pi-core", "/home/ryanj/work/inspo/opencode-template"];

export function main() {
  const errors = [];
  const skillsDir = join(root, ".pi", "skills");
  const dirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, "SKILL.md"))).sort() : [];
  if (dirs.length < MIN_SKILLS) errors.push("expected at least " + MIN_SKILLS + " skills, found " + dirs.length);
  const reports = [];
  for (const dir of dirs) {
    const text = readFileSync(join(skillsDir, dir, "SKILL.md"), "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) {
      errors.push(dir + ": missing frontmatter");
      continue;
    }
    if (!fm.name || !String(fm.name).trim()) errors.push(dir + ": frontmatter name required");
    if (!fm.description || !String(fm.description).trim()) errors.push(dir + ": frontmatter description required");
    if (!text.includes("source: /home/ryanj/work/projects/pi-core") && !text.includes("source: /home/ryanj/work/inspo/opencode-template")) {
      errors.push(dir + ": missing source annotation (pi-core or opencode-template)");
    }
    if (!text.toLowerCase().includes("prewalk")) errors.push(dir + ": body must mention prewalk");
    reports.push(dir + " (name=" + fm.name + ")");
  }
  if (errors.length > 0) return { ok: false, message: "skills: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "skills: OK — " + dirs.length + " discovered (min " + MIN_SKILLS + ")\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
