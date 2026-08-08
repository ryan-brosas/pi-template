import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const PAIRS = { "research.md": "research", "implement.md": "implementation", "test.md": "testing", "review.md": "review" };

export function main() {
  const errors = [];
  const promptsDir = join(root, ".pi", "prompts");
  const files = existsSync(promptsDir) ? readdirSync(promptsDir).filter((n) => n.endsWith(".md")).sort() : [];
  for (const want of Object.keys(PAIRS)) if (!files.includes(want)) errors.push("missing prompt: " + want);
  const reports = [];
  for (const f of files) {
    const text = readFileSync(join(promptsDir, f), "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!fm) {
      errors.push(f + ": missing frontmatter");
      continue;
    }
    const meta = {};
    for (const line of fm[1].split("\n")) {
      const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
      if (m) meta[m[1]] = m[2];
    }
    if (!meta.description || !String(meta.description).trim()) errors.push(f + ": frontmatter description required");
    const body = text.slice(fm[0].length);
    if (!body.includes(PAIRS[f])) errors.push(f + ": body must reference the " + PAIRS[f] + " skill");
    if (!body.includes("prewalk")) errors.push(f + ": body must defer to prewalk");
    reports.push(f + " -> " + PAIRS[f]);
  }
  if (errors.length > 0) return { ok: false, message: "prompts: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "prompts: OK — " + files.length + " thin entry points\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
