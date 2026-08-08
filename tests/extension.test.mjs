import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkflowStatusTool, createResearchGuidanceTool, buildWorkflowStatusText } from "../.pi/extensions/workflow.ts";

const CFG = {
  mcpServers: {
    exa: { baseUrl: "http://127.0.0.1:20128/api/mcp/stream", allowedTools: ["omniroute_web_search", "omniroute_web_fetch"] },
    context7: { command: "npx", args: ["-y", "@upstash/context7-mcp@3.2.5"] },
    deepwiki: { baseUrl: "https://mcp.deepwiki.com/mcp" },
  },
};

async function load() {
  const mod = await import("../.pi/extensions/workflow.ts");
  return mod;
}

test("extension: registration — two read-only tools and one status command", async () => {
  const mod = await load();
  const tools = [];
  const commands = [];
  mod.default({ registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) });
  assert.deepEqual(tools.map((t) => t.name).sort(), ["research_guidance", "workflow_status"]);
  assert.deepEqual(commands, ["workflow"]);
});

test("extension: research status reports lanes, packs, and host refs", async () => {
  const mod = await load();
  const tool = mod.createWorkflowStatusTool(() => CFG);
  const result = await tool.execute();
  assert.match(result.content[0].text, /^Prewalk:/m);
  assert.match(result.content[0].text, /Research providers:/m);
  assert.match(result.content[0].text, /mcp\.context7\.query-docs/);
});

test("extension: legacy OmniRoute alias is detected and documented", async () => {
  const mod = await load();
  const tool = mod.createResearchGuidanceTool(() => CFG);
  const result = await tool.execute("1", { intent: "current ai news" });
  assert.equal(result.details.provider, "omniroute");
  const omni = result.details.providers.find((p) => p.name === "omniroute");
  assert.equal(omni?.aliasUsed, "exa");
  assert.equal(omni?.configured, true);
  const status = mod.buildWorkflowStatusText(process.cwd(), CFG);
  assert.match(status, /alias \"exa\"/);
});

test("extension: Context7 guidance returns exact refs and lane", async () => {
  const mod = await load();
  const tool = mod.createResearchGuidanceTool(() => CFG);
  const result = await tool.execute("2", { intent: "react hooks api reference" });
  assert.equal(result.details.provider, "context7");
  assert.deepEqual(result.details.refs, ["mcp.context7.query-docs"]);
});

test("extension: DeepWiki guidance returns exact refs and lane", async () => {
  const mod = await load();
  const tool = mod.createResearchGuidanceTool(() => CFG);
  const result = await tool.execute("3", { intent: "how is the vue repo organized" });
  assert.equal(result.details.provider, "deepwiki");
  assert.deepEqual(result.details.refs, ["mcp.deepwiki.read_wiki_contents", "mcp.deepwiki.ask_question"]);
});

test("extension: no fake dispatch wrapper anywhere", async () => {
  const mod = await load();
  const tool = mod.createResearchGuidanceTool(() => CFG);
  const result = await tool.execute("4", { intent: "current news" });
  assert.equal(/dispatch[- ]ready/i.test(result.content[0].text), false);
  const status = buildWorkflowStatusText(process.cwd(), CFG);
  assert.equal(/dispatch[- ]ready/i.test(status), false);
});
