import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { researchIntent, buildResearchGuidance } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const CFG = { mcpServers: { context7: { command: "npx", args: ["-y", "@upstash/context7-mcp@3.2.5"], env: { CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}" } } } };
const EMPTY = {};

test("context7: library-docs intent routes to context7 with resolve-then-query refs", () => {
  const lane = researchIntent("react hooks api documentation");
  assert.equal(lane.lane, "library-docs");
  assert.equal(lane.provider, "context7");
  assert.ok(lane.refs.includes("mcp.context7.query-docs"));
});

test("context7: guidance sequences resolve-library-id before query-docs", () => {
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "context7-docs", "SKILL.md"), "utf8").toLowerCase();
  const resolveStep = "1. `mcp.context7.resolve-library-id`";
  const queryStep = "2. `mcp.context7.query-docs`";
  assert.ok(skill.includes(resolveStep), "step 1 must be resolve-library-id");
  assert.ok(skill.includes(queryStep), "step 2 must be query-docs");
  assert.ok(skill.indexOf(resolveStep) < skill.indexOf(queryStep), "resolve must be documented before query");
});

test("context7: configured without embedded credentials (3.2.5 reference only)", () => {
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "context7-docs", "SKILL.md"), "utf8");
  assert.match(skill, /@upstash\/context7-mcp@3\.2\.5/);
  assert.equal(/CONTEXT7_API_KEY\s*[:=]\s*[^$]/.test(skill), false, "no credential values");
});

test("context7: missing provider falls back to generic search and OmniRoute fetch", () => {
  const g = buildResearchGuidance(EMPTY, { intent: "stripe sdk api reference" });
  assert.equal(g.lane.provider, "context7");
  assert.match(g.guidance, /not configured/);
  assert.match(g.guidance, /mcp\.\$search/);
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "context7-docs", "SKILL.md"), "utf8").toLowerCase();
  assert.match(skill, /mcp\.exa\.omniroute_web_fetch/);
});

test("context7: stale/unsupported docs direct to official source via OmniRoute fetch", () => {
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "context7-docs", "SKILL.md"), "utf8").toLowerCase();
  assert.match(skill, /official/);
  assert.match(skill, /stale/);
  assert.equal(existsSync(join(root, ".pi", "skills", "packs", "research", "context7-docs", "SKILL.md")), true);
});
