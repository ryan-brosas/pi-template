import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();
const MIN_SKILLS = 12;
const SOURCE_ROOTS = [
  "/home/ryanj/work/projects/pi-core",
  "/home/ryanj/work/inspo/opencode-template",
  "/home/ryanj/.pi/agent",
  "/home/ryanj/work/projects/omniroute-fork",
  "/home/ryanj/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs",
];

export function main() {
  const errors = [];
  const skillsRoot = join(root, ".pi", "skills");
  const walk = (dir) => {
    let found = [];
    if (!existsSync(dir)) return found;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync(join(full, "SKILL.md"))) found.push(full);
        else found = found.concat(walk(full));
      }
    }
    return found;
  };
  const skillDirs = walk(skillsRoot);
  if (skillDirs.length < MIN_SKILLS) errors.push("expected at least " + MIN_SKILLS + " skills, found " + skillDirs.length);
  const reports = [];
  for (const dir of skillDirs) {
    const rel = dir.slice(skillsRoot.length + 1);
    const text = readFileSync(join(dir, "SKILL.md"), "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) {
      errors.push(rel + ": missing frontmatter");
      continue;
    }
    if (!fm.name || !String(fm.name).trim()) errors.push(rel + ": frontmatter name required");
    if (!fm.description || !String(fm.description).trim()) errors.push(rel + ": frontmatter description required");
    const annotated = SOURCE_ROOTS.some((r0) => text.includes("source: " + r0));
    if (!annotated) errors.push(rel + ": missing source annotation");
    if (!text.toLowerCase().includes("prewalk")) errors.push(rel + ": body must mention prewalk");
    reports.push(rel + " (" + fm.name + ")");
  }
  if (errors.length > 0) return { ok: false, message: "skills: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "skills: OK — " + skillDirs.length + " discovered (min " + MIN_SKILLS + ")\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
