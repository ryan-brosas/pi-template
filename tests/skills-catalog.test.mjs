import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const REQUIRED = [
  "brainstorming", "spec-driven-development", "test-driven-development",
  "debugging-and-error-recovery", "verification-before-completion",
  "agent-code-quality-gate", "testing-anti-patterns", "api-and-interface-design",
  "using-git-worktrees", "capability-delegation", "agent-observability",
  "agent-supervision", "typescript-coding-standards", "writing-skills",
  "workflow-lifecycle", "workflow-deep-research", "workflow-audit",
  "workflow-batch-implement", "workflow-gc"
];

test("skills-catalog: at least 12 skills discovered", () => {
  const dirs = readdirSync(join(root, ".pi", "skills")).filter((n) => existsSync(join(root, ".pi", "skills", n, "SKILL.md")));
  assert.ok(dirs.length >= 12, "found " + dirs.length);
});

test("skills-catalog: curated catalog present and frontmatter valid (incl. folded description)", () => {
  const skillsDir = join(root, ".pi", "skills");
  for (const name of REQUIRED) {
    const p = join(skillsDir, name, "SKILL.md");
    assert.equal(existsSync(p), true, name);
    const fm = parseFrontmatter(readFileSync(p, "utf8"));
    assert.ok(fm, name + " frontmatter");
    assert.ok(fm?.name, name + " name");
    assert.ok(fm?.description, name + " description");
  }
  const qg = parseFrontmatter(readFileSync(join(skillsDir, "agent-code-quality-gate", "SKILL.md"), "utf8"));
  assert.ok((qg?.description ?? "").length > 40, "folded description must be joined");
});

test("skills-catalog: every skill carries a source annotation", () => {
  const skillsDir = join(root, ".pi", "skills");
  for (const dir of readdirSync(skillsDir)) {
    const p = join(skillsDir, dir, "SKILL.md");
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    assert.match(text, /source: \/home\/ryanj\/(work\/projects\/pi-core|work\/inspo\/opencode-template)/, dir);
  }
});
