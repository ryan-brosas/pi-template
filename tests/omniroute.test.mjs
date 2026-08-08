import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { researchIntent, buildResearchGuidance, listMcpCapabilities, RESEARCH_LANES } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const OMNI = { mcpServers: { omniroute: { baseUrl: "http://127.0.0.1:20128/api/mcp/stream" } } };
const LEGACY = { mcpServers: { exa: { baseUrl: "http://127.0.0.1:20128/api/mcp/stream" } } };
const SKILL_PATH = join(root, ".pi", "skills", "packs", "research", "omniroute-research", "SKILL.md");

test("omniroute: general web intent routes to omniroute as primary lane", () => {
  const lane = researchIntent("current news about ai agents");
  assert.equal(lane.lane, "general-web");
  assert.equal(lane.provider, "omniroute");
  assert.ok(lane.refs.includes("mcp.exa.omniroute_web_search"));
  assert.ok(lane.refs.includes("mcp.exa.omniroute_web_fetch"));
});

test("omniroute: legacy exa alias resolves to the omniroute lane", () => {
  const caps = listMcpCapabilities(LEGACY);
  assert.ok(caps.ready.includes("omniroute"), "exa alias must count as omniroute ready");
  const g = buildResearchGuidance(LEGACY, { intent: "news" });
  assert.equal(g.lane.provider, "omniroute");
  assert.match(g.guidance, /alias/);
});

test("omniroute: skill documents schemas, failover, and webclaw/browser escalation", () => {
  const skill = readFileSync(SKILL_PATH, "utf8").toLowerCase();
  assert.match(skill, /max_results/);
  assert.match(skill, /omniroute_web_fetch/);
  assert.match(skill, /failover/);
  assert.match(skill, /webclaw/);
  assert.match(skill, /primary general-web/);
});

test("omniroute: all nine search providers documented", () => {
  const skill = readFileSync(SKILL_PATH, "utf8").toLowerCase();
  for (const prov of ["serper-search", "brave-search", "perplexity-search", "exa-search", "tavily-search", "google-pse-search", "linkup-search", "searchapi-search", "searxng-search"]) assert.ok(skill.includes(prov), prov);
});

test("omniroute: all four fetch providers and formats documented", () => {
  const skill = readFileSync(SKILL_PATH, "utf8").toLowerCase();
  for (const prov of ["firecrawl", "jina-reader", "tavily-search", "tinyfish"]) assert.ok(skill.includes(prov), prov);
  for (const fmt of ["markdown", "html", "links", "screenshot"]) assert.ok(skill.includes(fmt), fmt);
  assert.match(skill, /wait_for_selector/);
  assert.match(skill, /include_metadata/);
});

test("omniroute: output evidence fields documented including usage telemetry", () => {
  const skill = readFileSync(SKILL_PATH, "utf8").toLowerCase();
  for (const field of ["cached", "position", "screenshot_url", "queries_used", "search_cost_usd"]) assert.ok(skill.includes(field), field);
  assert.match(skill, /telemetry/);
});

test("omniroute: no standalone Exa dependency remains anywhere", () => {
  const banned = ["EXA_" + "API_KEY", "@exa/" + "mcp-server", "mcp/exa" + ".example.json"];
  let out = "";
  try {
    out = execFileSync("git", ["grep", "-n", "-E", banned.join("|")], { cwd: root, encoding: "utf8" });
  } catch {
    out = "";
  }
  assert.equal(out.trim(), "", "standalone Exa references remain: " + out);
  const examples = readdirSync(join(root, "mcp"));
  assert.equal(examples.includes("exa.example.json"), false);
  assert.equal(examples.includes("omniroute.example.json"), true);
  assert.equal(existsSync(join(root, ".env.example")), true);
  const env = readFileSync(join(root, ".env.example"), "utf8");
  assert.equal(env.includes("EXA_" + "API_KEY"), false);
});

test("omniroute: RESEARCH_LANES declares omni/context7/deepwiki canonical order", () => {
  assert.deepEqual(RESEARCH_LANES.map((l) => l.name), ["omniroute", "context7", "deepwiki"]);
  assert.deepEqual(RESEARCH_LANES[0].aliases, ["exa"]);
});

