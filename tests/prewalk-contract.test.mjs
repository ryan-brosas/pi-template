import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateChecklistContract } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const validFixture = {
  items: [
    { task: "Curate the skill catalog from pi-core.", validation: "npm run validate:skills exits 0" },
    { task: "Rebuild workflow contracts from opencode-template.", validation: "npm run validate:workflows exits 0" },
    { task: "Replace the MCP wrapper with honest guidance.", validation: "npm run typecheck exits 0 and extension tests pass" },
    { task: "Upgrade the prompt surface to seven commands.", validation: "npm run validate:prompts exits 0" },
    { task: "Add source manifest and drift tooling.", validation: "npm run validate:sources exits 0" },
    { task: "Rewrite docs around the Ultra Fabric lifecycle.", validation: "npm run validate:structure exits 0" },
    { task: "Pin lifecycle seams with behavioral tests.", validation: "npm test reports named suites passing" }
  ],
  schema: {
    intent: "Ground the template in pi-core skills and opencode workflows.",
    references: [{ repository: "pi-core", question: "Which skills to curate?", evidenceRefs: [".pi/skills/brainstorming/SKILL.md"] }],
    localScope: { files: ["package.json"] },
    invariants: ["Prewalk remains authority."],
    postconditions: ["Template contains curated assets."]
  }
};

test("prewalk-contract: gated fabric config pins research-before-checklist", () => {
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.equal(fabric.configVersion, 3);
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
  assert.ok(r.errors.some((e) => e.includes("5-9")));
});

test("prewalk-contract: missing schema references rejected", () => {
  const r = validateChecklistContract({ ...validFixture, schema: { ...validFixture.schema, references: [] } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("references")));
});

test("prewalk-contract: research precedes the checklist and never mutates", () => {
  const research = readFileSync(join(root, ".pi", "skills", "workflow-deep-research", "SKILL.md"), "utf8").toLowerCase();
  assert.match(research, /before a plan or checklist exists/);
  assert.match(research, /never mutates/);
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.equal(fabric.prewalk.verificationMode, "gated");
});

test("prewalk-contract: accepted schema precedes mutation — extension registers only read-only tools", async () => {
  const mod = await import("../.pi/extensions/workflow.ts");
  const tools = [];
  const commands = [];
  mod.default({ registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) });
  assert.deepEqual(tools.map((t) => t.name).sort(), ["mcp_guidance", "workflow_status"]);
  assert.deepEqual(commands, ["workflow"]);
  assert.equal(tools.some((t) => /write|edit|exec|bash/.test(t.name)), false);
});

test("prewalk-contract: executor owns implementation after handoff — batch workflow requires handoff", () => {
  const batch = readFileSync(join(root, ".pi", "skills", "workflow-batch-implement", "SKILL.md"), "utf8").toLowerCase();
  assert.match(batch, /handoff/);
  assert.match(batch, /executor/);
  const lifecycle = readFileSync(join(root, ".pi", "skills", "workflow-lifecycle", "SKILL.md"), "utf8").toLowerCase();
  assert.match(lifecycle, /only role that mutates/);
});

test("prewalk-contract: review is read-only and verifies before completion", () => {
  const audit = readFileSync(join(root, ".pi", "skills", "workflow-audit", "SKILL.md"), "utf8").toLowerCase();
  assert.match(audit, /read-only/);
  const verification = existsSync(join(root, ".pi", "skills", "verification-before-completion", "SKILL.md"));
  assert.equal(verification, true);
});
