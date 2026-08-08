import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const REQUIRED_HEADINGS = ["## Skills catalog", "## Workflow catalog", "## Ultra Fabric lifecycle", "## MCP and external research", "## Installation", "## Verification"];
const REQUIRED_SCRIPTS = ["validate:structure", "validate:config", "validate:skills", "validate:workflows", "validate:prompts", "validate:mcp", "validate:sources", "scan:secrets", "sync:sources", "typecheck", "test", "smoke:install", "check"];

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
  if (readme.includes("returns a dispatch plan")) errors.push("README.md must not claim the extension dispatches MCP");
  if (!existsSync(join(root, ".gitignore"))) errors.push(".gitignore missing");
  if (!existsSync(join(root, ".env.example"))) errors.push(".env.example missing");
  for (const doc of ["architecture.md", "operators.md", "sources.md", "verification.md"]) {
    if (!existsSync(join(root, "docs", doc))) errors.push("docs/" + doc + " missing");
  }
  if (errors.length > 0) return { ok: false, message: "structure: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "structure: OK — package, README (" + REQUIRED_HEADINGS.length + " headings), .gitignore, docs present" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
