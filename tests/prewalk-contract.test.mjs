import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateChecklistContract } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const validFixture = {
  items: [
    { task: "Create package skeleton and docs.", validation: "npm run validate:structure exits 0" },
    { task: "Preserve and validate fabric config.", validation: "npm run validate:config exits 0" },
    { task: "Add skills and prompts.", validation: "npm run validate:skills and validate:prompts exit 0" },
    { task: "Add minimal extension.", validation: "npm run typecheck exits 0 and extension tests pass" },
    { task: "Add optional MCP examples.", validation: "npm run validate:mcp exits 0" },
    { task: "Add lifecycle test suites.", validation: "npm test reports named suites passing" },
    { task: "Verify scope and publish.", validation: "npm run check exits 0 and push lands" }
  ],
  schema: {
    intent: "Implement the template.",
    references: [{ repository: "pi-coding-agent", question: "Capability boundaries?", evidenceRefs: ["docs/extensions.md"] }],
    localScope: { files: ["package.json"] },
    invariants: ["Prewalk remains authority."],
    postconditions: ["Repository contains usable assets."]
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

test("prewalk-contract: research skill mandates research before the checklist", () => {
  const body = readFileSync(join(root, ".pi", "skills", "research", "SKILL.md"), "utf8");
  assert.match(body, /before the checklist/);
});

test("prewalk-contract: no template asset instructs bypassing prewalk", () => {
  const forbidden = ["skip the checklist", "ignore the checklist", "bypass the checklist", "may bypass prewalk"];
  const skillsDir = join(root, ".pi", "skills");
  for (const d of readdirSync(skillsDir)) {
    const p = join(skillsDir, d, "SKILL.md");
    if (!existsSync(p)) continue;
    const body = readFileSync(p, "utf8").toLowerCase();
    for (const f of forbidden) assert.equal(body.includes(f), false, d + " contains: " + f);
  }
  const promptsDir = join(root, ".pi", "prompts");
  for (const f of readdirSync(promptsDir)) {
    const body = readFileSync(join(promptsDir, f), "utf8").toLowerCase();
    for (const bad of forbidden) assert.equal(body.includes(bad), false, f + " contains: " + bad);
  }
});

test("prewalk-contract: executor ownership — extension registers only read-only dispatch tools", async () => {
  const mod = await import("../.pi/extensions/workflow.ts");
  const tools = [];
  const commands = [];
  mod.default({ registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) });
  const names = tools.map((t) => t.name);
  assert.deepEqual(names.sort(), ["mcp_capabilities", "mcp_invoke"]);
  assert.deepEqual(commands, ["workflow"]);
  assert.equal(tools.some((t) => /write|edit|exec|bash/.test(t.name)), false);
});
