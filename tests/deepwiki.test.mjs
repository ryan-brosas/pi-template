import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { researchIntent, buildResearchGuidance } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const CFG = { mcpServers: { deepwiki: { baseUrl: "https://mcp.deepwiki.com/mcp" } } };
const EMPTY = {};

test("deepwiki: repository-architecture intent routes to deepwiki", () => {
  const lane = researchIntent("how is the astro repository organized");
  assert.equal(lane.lane, "repo-qa");
  assert.equal(lane.provider, "deepwiki");
  assert.ok(lane.refs.includes("mcp.deepwiki.read_wiki_contents"));
  assert.ok(lane.refs.includes("mcp.deepwiki.ask_question"));
});

test("deepwiki: local code is excluded — codemap/CGC first", () => {
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "deepwiki-repositories", "SKILL.md"), "utf8").toLowerCase();
  assert.match(skill, /codemap/);
  assert.match(skill, /local code/);
  assert.match(skill, /public/);
  assert.match(skill, /never a general web search|not a web-search duplicate/, "deepwiki must explicitly exclude general web");
});

test("deepwiki: unavailable provider falls back to CGC/local clone/GitHub/OmniRoute", () => {
  const g = buildResearchGuidance(EMPTY, { intent: "what does the lucide repo do" });
  assert.equal(g.lane.provider, "deepwiki");
  assert.match(g.guidance, /not configured/);
  const skill = readFileSync(join(root, ".pi", "skills", "packs", "research", "deepwiki-repositories", "SKILL.md"), "utf8").toLowerCase();
  assert.match(skill, /clone/);
  assert.match(skill, /github/);
  assert.match(skill, /omniroute/);
});

test("deepwiki: not listed as a primary general web provider", () => {
  const router = readFileSync(join(root, ".pi", "skills", "packs", "research", "research-router", "SKILL.md"), "utf8");
  const omni = readFileSync(join(root, ".pi", "skills", "packs", "research", "omniroute-research", "SKILL.md"), "utf8").toLowerCase();
  assert.match(router, /general-web/);
  assert.match(omni, /primary general-web/);
});

test("deepwiki: guidance carries exact refs without fabricating execution", () => {
  const g = buildResearchGuidance(CFG, { intent: "how is the vue repo structured" });
  assert.deepEqual(g.refs, ["mcp.deepwiki.read_wiki_contents", "mcp.deepwiki.ask_question"]);
  assert.equal(/dispatch[- ]ready/i.test(g.guidance), false);
});
