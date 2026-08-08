import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateChecklistContract } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const validFixture = {
  items: [
    { task: "Organize skills into packs.", validation: "npm run validate:packs exits 0" },
    { task: "Write detailed research skills.", validation: "npm run validate:research exits 0" },
    { task: "Make OmniRoute primary; retire Exa.", validation: "git grep for standalone Exa env key exits 1" },
    { task: "Restore Context7 docs lane.", validation: "context7 tests pass" },
    { task: "Scope DeepWiki to repo Q&A.", validation: "deepwiki tests pass" },
    { task: "Provider-neutral extension status.", validation: "npm run typecheck exits 0" },
    { task: "Document research routing.", validation: "npm run validate:structure exits 0" }
  ],
  schema: {
    intent: "Reorganize into packs and fix research routing.",
    references: [{ repository: "pi-coding-agent docs", question: "How are skills triggered?", evidenceRefs: ["docs/skills.md"] }],
    localScope: { files: ["package.json"] },
    invariants: ["Prewalk remains authority."],
    postconditions: ["Packs and lanes are explicit."]
  }
};

test("prewalk-contract: gated fabric config pins research-before-checklist", () => {
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.equal(fabric.prewalk.verificationMode, "gated");
  assert.equal(fabric.prewalk.arm, "session");
});

test("prewalk-contract: valid 7-item checklist with schema contract passes", () => {
  const r = validateChecklistContract(validFixture);
  assert.equal(r.ok, true, r.errors.join("; "));
});

test("prewalk-contract: fewer than 5 items rejected", () => {
  const r = validateChecklistContract({ items: validFixture.items.slice(0, 4), schema: validFixture.schema });
  assert.equal(r.ok, false);
});

test("prewalk-contract: research precedes checklist and stays read-only", () => {
  const research = readFileSync(join(root, ".pi", "skills", "packs", "research", "workflow-deep-research", "SKILL.md"), "utf8").toLowerCase();
  assert.match(research, /read-only/);
  assert.match(research, /never mutates/);
  const router = readFileSync(join(root, ".pi", "skills", "packs", "research", "research-router", "SKILL.md"), "utf8").toLowerCase();
  assert.match(router, /read-only/);
});

test("prewalk-contract: accepted schema precedes mutation — extension registers only read-only tools", async () => {
  const mod = await import("../.pi/extensions/workflow.ts");
  const tools = [];
  const commands = [];
  mod.default({ registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) });
  assert.deepEqual(tools.map((t) => t.name).sort(), ["research_guidance", "workflow_status"]);
  assert.deepEqual(commands, ["workflow"]);
  assert.equal(tools.some((t) => /write|edit|exec|bash/.test(t.name)), false);
});

test("prewalk-contract: executor owns implementation after handoff", () => {
  const batch = readFileSync(join(root, ".pi", "skills", "packs", "delivery", "workflow-batch-implement", "SKILL.md"), "utf8").toLowerCase();
  assert.match(batch, /handoff/);
  assert.match(batch, /executor/);
});

test("prewalk-contract: review is read-only", () => {
  const audit = readFileSync(join(root, ".pi", "skills", "packs", "quality", "workflow-audit", "SKILL.md"), "utf8").toLowerCase();
  assert.match(audit, /read-only/);
});
