import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const TARGETS = {
  "create.md": ["spec-driven-development", "brainstorming"],
  "fix.md": ["debugging-and-error-recovery"],
  "audit.md": ["agent-code-quality-gate", "workflow-audit"],
  "research.md": ["research-router", "workflow-deep-research"],
  "implement.md": ["test-driven-development", "workflow-batch-implement"],
  "review.md": ["verification-before-completion", "agent-code-quality-gate"],
  "gc.md": ["workflow-gc"],
  "init.md": ["research-router", "workflow-deep-research"]
};
const MAX_PROMPT_CHARS = 900;
const OPERATIONAL = new Set(["init.md"]);

function parseMeta(fm) {
  const meta = {};
  for (const line of fm[1].split("\n")) {
    const m = /^([a-zA-Z-]+):\s*(.*)$/.exec(line);
    if (m && m[1] !== undefined) meta[m[1]] = (m[2] ?? "").trim();
  }
  return meta;
}

export function main() {
  const errors = [];
  const promptsDir = join(root, ".pi", "prompts");
  const files = existsSync(promptsDir) ? readdirSync(promptsDir).filter((n) => n.endsWith(".md")).sort() : [];
  for (const want of Object.keys(TARGETS)) if (!files.includes(want)) errors.push("missing prompt: " + want);
  const reports = [];
  for (const f of files) {
    const text = readFileSync(join(promptsDir, f), "utf8");
    if (!OPERATIONAL.has(f) && text.length > MAX_PROMPT_CHARS) errors.push(f + ": exceeds " + MAX_PROMPT_CHARS + " chars (" + text.length + ")");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!fm) {
      errors.push(f + ": missing frontmatter");
      continue;
    }
    const meta = parseMeta(fm);
    if (!meta.description) errors.push(f + ": frontmatter description required");
    const body = text.slice(fm[0].length);
    if (!body.includes("prewalk")) errors.push(f + ": body must defer to prewalk");
    const targets = TARGETS[f] ?? [];
    for (const t of targets) if (!body.includes(t)) errors.push(f + ": body must reference target " + t);
    if (f === "init.md") {
      if (!/argument-hint:\s*"\[--deep\]"/.test(text)) errors.push("init.md: argument-hint must expose exactly [--deep]");
      if (!body.includes("/init --deep")) errors.push("init.md: must document /init --deep");
      if (/--context|--user|--all/.test(body)) errors.push("init.md: undocumented flags must not be promoted");
      for (const sec of ["parse mode and establish scope", "idempotency and safety contract", "read-only discovery", "preview before mutation", "executor write phase", "verification", "completion report"]) {
        if (!body.toLowerCase().includes(sec)) errors.push("init.md: missing section " + sec);
      }
    }
    reports.push(f + " -> " + (targets.length ? targets.join(", ") : "none") + (OPERATIONAL.has(f) ? " (operational)" : ""));
  }
  if (errors.length > 0) return { ok: false, message: "prompts: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "prompts: OK — " + files.length + " commands (7 thin + init operational)\n  " + reports.join("\n  ") };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}

