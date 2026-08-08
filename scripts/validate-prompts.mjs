import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const EXPECTED = ["create", "fix", "audit", "research", "implement", "review", "gc"];
const TARGETS = {
  "create.md": ["spec-driven-development", "brainstorming"],
  "fix.md": ["debugging-and-error-recovery"],
  "audit.md": ["agent-code-quality-gate", "workflow-audit"],
  "research.md": ["workflow-deep-research"],
  "implement.md": ["test-driven-development", "workflow-batch-implement"],
  "review.md": ["verification-before-completion", "agent-code-quality-gate"],
  "gc.md": ["workflow-gc"]
};
const MAX_PROMPT_CHARS = 900;

export function main() {
  const errors = [];
  const promptsDir = join(root, ".pi", "prompts");
  const files = existsSync(promptsDir) ? readdirSync(promptsDir).filter((n) => n.endsWith(".md")).sort() : [];
  for (const want of Object.keys(TARGETS)) if (!files.includes(want)) errors.push("missing prompt: " + want);
  const reports = [];
  for (const f of files) {
    const text = readFileSync(join(promptsDir, f), "utf8");
    if (text.length > MAX_PROMPT_CHARS) errors.push(f + ": exceeds " + MAX_PROMPT_CHARS + " chars (" + text.length + ")");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!fm) {
      errors.push(f + ": missing frontmatter");
      continue;
    }
    const meta = {};
    for (const line of fm[1].split("\n")) {
      const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
      if (m && m[1] !== undefined) meta[m[1]] = (m[2] ?? "").trim();
    }
    if (!meta.description) errors.push(f + ": frontmatter description required");
    const body = text.slice(fm[0].length);
    if (!body.includes("prewalk")) errors.push(f + ": body must defer to prewalk");
    const targets = TARGETS[f] ?? [];
    for (const t of targets) if (!body.includes(t)) errors.push(f + ": body must reference target " + t);
    reports.push(f + " -> " + targets.join(", "));
  }
  if (errors.length > 0) return { ok: false, message: "prompts: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "prompts: OK — " + files.length + " thin commands\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
