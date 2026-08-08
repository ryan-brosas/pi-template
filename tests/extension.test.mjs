import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkflowStatusTool, createMcpGuidanceTool, buildWorkflowStatusText } from "../.pi/extensions/workflow.ts";

const BOTH = {
  mcpServers: {
    exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } },
    deepwiki: { url: "https://mcp.deepwiki.com/mcp", headers: { Authorization: "Bearer ${DEEPWIKI_API_KEY}" } }
  }
};

test("extension: registration — two read-only tools and one status command", async () => {
  const tools = [];
  const commands = [];
  const stub = { registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) };
  const mod = await import("../.pi/extensions/workflow.ts");
  mod.default(stub);
  assert.deepEqual(tools.map((t) => t.name).sort(), ["mcp_guidance", "workflow_status"]);
  assert.deepEqual(commands, ["workflow"]);
  assert.ok(tools.every((t) => typeof t.execute === "function"));
});

test("extension: status reports lifecycle, assets, and MCP host tools", async () => {
  const tool = createWorkflowStatusTool(() => BOTH);
  const result = await tool.execute();
  assert.match(result.content[0].text, /^Prewalk:/m);
  assert.match(result.content[0].text, /Skills:/m);
  assert.match(result.content[0].text, /mcp\.\$search/);
  assert.match(result.content[0].text, /mcp\.\$call/);
});

test("extension: missing-provider guidance is actionable and routes to host tools", async () => {
  const tool = createMcpGuidanceTool(() => BOTH);
  const result = await tool.execute("1", { server: "missing-server", tool: "search" });
  assert.equal(result.details.code, "guidance");
  assert.deepEqual(result.details.refs, ["mcp.$search", "mcp.$call"]);
  assert.match(result.content[0].text, /\.mcporter/);
  assert.match(result.content[0].text, /mcp\.\$search/);
});

test("extension: no fake dispatch wrapper — no dispatch-plan language anywhere", async () => {
  const tool = createMcpGuidanceTool(() => BOTH);
  const result = await tool.execute("2", { server: "exa", tool: "search", query: "x" });
  const text = result.content[0].text;
  assert.equal(/dispatch[- ]ready/i.test(text), false);
  assert.equal(/fabricate/.test(text), false);
  const status = buildWorkflowStatusText(process.cwd(), BOTH);
  assert.equal(/dispatch[- ]ready/i.test(status), false);
});
