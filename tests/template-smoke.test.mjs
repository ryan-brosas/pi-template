import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));

test("template-smoke: required files exist", () => {
  const files = [
    "package.json", "README.md", ".gitignore", ".env.example", ".pi/fabric.json", ".pi/extensions/workflow.ts",
    "scripts/template-lib.ts", "scripts/validate-structure.mjs", "scripts/validate-config.mjs", "scripts/validate-skills.mjs",
    "scripts/validate-prompts.mjs", "scripts/validate-mcp.mjs", "scripts/scan-secrets.mjs", "scripts/smoke-install.mjs",
    "docs/architecture.md", "docs/operators.md"
  ];
  for (const f of files) assert.equal(existsSync(join(root, f)), true, f);
});

test("template-smoke: README contains required headings", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  for (const h of ["## Architecture", "## Prewalk lifecycle", "## Installation", "## MCP", "## Verification"]) assert.ok(readme.includes(h), h);
});

test("template-smoke: all four skills parse frontmatter", () => {
  const skills = readdirSync(join(root, ".pi", "skills"));
  assert.equal(skills.length, 4);
  for (const d of skills) {
    const text = readFileSync(join(root, ".pi", "skills", d, "SKILL.md"), "utf8");
    assert.match(text, /^---\nname: .+\ndescription: .+\n---/m, d);
  }
});

test("template-smoke: prompts reference their skill and prewalk", () => {
  const prompts = readdirSync(join(root, ".pi", "prompts")).filter((f) => f.endsWith(".md"));
  assert.equal(prompts.length, 4);
  for (const f of prompts) {
    const body = readFileSync(join(root, ".pi", "prompts", f), "utf8");
    assert.match(body, /^---\n/m);
    assert.ok(body.includes("prewalk"), f);
  }
});

test("template-smoke: fabric config parses as gated research prewalk", () => {
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.equal(fabric.prewalk?.verificationMode, "gated");
  assert.equal(typeof fabric.prewalk?.model, "string");
});

test("template-smoke: runtime state is never tracked", () => {
  let ignored = "";
  try {
    ignored = execFileSync("git", ["check-ignore", "--no-index", ".pi/fabric/anything", ".pi/hindsight/anything"], { cwd: root, encoding: "utf8" });
  } catch {
    /* both paths must be ignored */
  }
  assert.ok(ignored.includes(".pi/fabric/") && ignored.includes(".pi/hindsight/"), "runtime dirs must be gitignored");
  let skillIgnored = true;
  try {
    execFileSync("git", ["check-ignore", "--no-index", ".pi/skills/research/SKILL.md"], { cwd: root, encoding: "utf8" });
  } catch {
    skillIgnored = false;
  }
  assert.equal(skillIgnored, false, "skills must not be gitignored");
});
