import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateChecklistContract } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const validFixture = {
  items: [
    { task: "Expand OmniRoute guidance from authoritative schemas.", validation: "omniroute tests assert all providers/fields" },
    { task: "Add detailed init with exactly default and --deep modes.", validation: "init tests assert mode contract" },
    { task: "Keep init idempotent and prewalk-safe.", validation: "init tests assert preview/handoff/merge rules" },
    { task: "Define pi-native project artifacts.", validation: "init tests assert artifact contract" },
    { task: "Validate prompts operationally.", validation: "validate:prompts reports 8 commands" },
    { task: "Update docs and provenance.", validation: "structure/research/source tests pass" },
    { task: "Run full gate and push.", validation: "npm run check exits 0" }
  ],
  schema: {
    intent: "Add detailed project initialization and complete OmniRoute guidance.",
    references: [{ repository: "omniroute-fork", question: "Search/fetch schemas?", evidenceRefs: ["open-sse/mcp-server/schemas/tools.ts"] }],
    localScope: { files: [".pi/prompts/init.md"] },
    invariants: ["Prewalk remains authority."],
    postconditions: ["Init and OmniRoute are operational."]
  }
};

test("prewalk-contract: fabric config exposes the chosen guard state", () => {
  const fabric = JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
  assert.ok(["gated", "legacy", "off"].includes(fabric.prewalk.verificationMode));
  assert.ok(["session", "off"].includes(fabric.prewalk.arm));
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

