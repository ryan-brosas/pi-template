import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const REQUIRED_HEADINGS = ["## Architecture", "## Prewalk lifecycle", "## Installation", "## MCP", "## Verification"];
const REQUIRED_SCRIPTS = ["validate:structure", "validate:config", "validate:skills", "validate:prompts", "validate:mcp", "scan:secrets", "typecheck", "test", "smoke:install", "check"];

export function main() {
  const errors = [];
  const read = (p) => {
    try {
      return readFileSync(join(root, p), "utf8");
    } catch {
      return null;
    }
  };
  const pkg = JSON.parse(read("package.json") || "null") || null;
  if (!pkg || typeof pkg !== "object") errors.push("package.json missing or invalid");
  else for (const s of REQUIRED_SCRIPTS) if (typeof (pkg.scripts || {})[s] !== "string") errors.push("package.json script missing: " + s);
  const readme = read("README.md") || "";
  for (const h of REQUIRED_HEADINGS) if (!readme.includes(h)) errors.push("README.md missing heading: " + h);
  if (!existsSync(join(root, ".gitignore"))) errors.push(".gitignore missing");
  if (!existsSync(join(root, ".env.example"))) errors.push(".env.example missing");
  if (!existsSync(join(root, "docs", "architecture.md"))) errors.push("docs/architecture.md missing");
  if (!existsSync(join(root, "docs", "operators.md"))) errors.push("docs/operators.md missing");
  const skillsDir = join(root, ".pi", "skills");
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, "SKILL.md"))).sort() : [];
  for (const want of ["research", "implementation", "testing", "review"]) if (!skills.includes(want)) errors.push(".pi/skills/" + want + "/SKILL.md missing");
  const promptsDir = join(root, ".pi", "prompts");
  const prompts = existsSync(promptsDir) ? readdirSync(promptsDir).filter((n) => n.endsWith(".md")).sort() : [];
  for (const want of ["research", "implement", "test", "review"]) if (!prompts.includes(want + ".md")) errors.push(".pi/prompts/" + want + ".md missing");
  if (errors.length > 0) return { ok: false, message: "structure: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "structure: OK — package, README (" + REQUIRED_HEADINGS.length + " headings), .gitignore, 4 skills, 4 prompts, docs present" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
