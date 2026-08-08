import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const WORKFLOWS = ["workflow-lifecycle", "workflow-deep-research", "workflow-audit", "workflow-batch-implement", "workflow-gc"];

function readSkill(name) {
  const p = join(root, ".pi", "skills", name, "SKILL.md");
  assert.equal(existsSync(p), true, name);
  return readFileSync(p, "utf8");
}

test("workflow-routing: five workflow contracts exist with prewalk authority", () => {
  for (const w of WORKFLOWS) {
    const text = readSkill(w).toLowerCase();
    assert.ok(text.includes("prewalk"), w);
    assert.ok(text.includes("read-only"), w);
  }
});

test("workflow-routing: lifecycle defines scout/explore/plan/build/review role boundaries", () => {
  const text = readSkill("workflow-lifecycle").toLowerCase();
  for (const role of ["scout", "explore", "plan", "build", "review"]) assert.ok(text.includes(role), role);
  assert.match(text, /only role that mutates/);
  assert.match(text, /read-only roles/);
});

test("workflow-routing: research routes to scout/explore and is read-only; build routes to the executor after handoff", () => {
  const research = readSkill("workflow-deep-research").toLowerCase();
  assert.match(research, /`scout`/);
  assert.match(research, /`explore`/);
  assert.match(research, /never mutates/);
  const batch = readSkill("workflow-batch-implement").toLowerCase();
  assert.match(batch, /handoff/);
  assert.match(batch, /executor/);
});

test("workflow-routing: audit is a read-only review role; gc analysis is read-only", () => {
  const audit = readSkill("workflow-audit").toLowerCase();
  assert.match(audit, /`review`/);
  const gc = readSkill("workflow-gc").toLowerCase();
  assert.match(gc, /read-only/);
});
