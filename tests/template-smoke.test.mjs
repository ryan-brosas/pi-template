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
    "scripts/template-lib.ts", "scripts/sync-sources.mjs", "scripts/validate-skills.mjs", "scripts/validate-workflows.mjs",
    "scripts/validate-prompts.mjs", "scripts/validate-sources.mjs", "scripts/validate-mcp.mjs", "scripts/validate-config.mjs",
    "scripts/validate-structure.mjs", "scripts/scan-secrets.mjs", "scripts/smoke-install.mjs", "sources/manifest.json",
    "docs/architecture.md", "docs/operators.md", "docs/sources.md"
  ];
  for (const f of files) assert.equal(existsSync(join(root, f)), true, f);
});

test("template-smoke: README contains required sections and no fake-dispatch claim", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  for (const h of ["## Skills catalog", "## Workflow catalog", "## Ultra Fabric lifecycle", "## MCP and external research", "## Installation", "## Verification"]) assert.ok(readme.includes(h), h);
  assert.equal(readme.includes("returns a dispatch plan"), false);
});

test("template-smoke: seven thin prompts paired to skills", () => {
  const prompts = readdirSync(join(root, ".pi", "prompts")).filter((f) => f.endsWith(".md"));
  assert.equal(prompts.length, 7);
  for (const f of prompts) {
    const text = readFileSync(join(root, ".pi", "prompts", f), "utf8");
    assert.ok(text.length <= 900, f + " size");
    assert.match(text, /^---\n/m);
    assert.ok(text.includes("prewalk"), f);
  }
});

test("template-smoke: fabric config parses as gated research prewalk", () => {
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.equal(fabric.prewalk?.verificationMode, "gated");
  assert.equal(typeof fabric.prewalk?.model, "string");
});

test("template-smoke: no dispatch-plan language in extension or tests", () => {
  const files = [".pi/extensions/workflow.ts", ...readdirSync(join(root, "tests")).map((f) => "tests/" + f)];
  for (const f of files) {
    if (!f.endsWith(".ts") && !f.endsWith(".mjs")) continue;
    const text = readFileSync(join(root, f), "utf8");
    assert.equal(/dispatch[- ]ready/i.test(text), false, f);
  }
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
    execFileSync("git", ["check-ignore", "--no-index", ".pi/skills/brainstorming/SKILL.md"], { cwd: root, encoding: "utf8" });
  } catch {
    skillIgnored = false;
  }
  assert.equal(skillIgnored, false, "skills must not be gitignored");
});
