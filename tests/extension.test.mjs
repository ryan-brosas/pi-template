import { test } from "node:test";
import assert from "node:assert/strict";
import { createMcpInvokeTool, createMcpCapabilitiesTool, buildWorkflowStatus } from "../.pi/extensions/workflow.ts";

const BOTH = {
  mcpServers: {
    exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } },
    deepwiki: { url: "https://mcp.deepwiki.com/mcp", headers: { Authorization: "Bearer ${DEEPWIKI_API_KEY}" } }
  }
};

test("extension: default factory registers two tools and one command", async () => {
  const tools = [];
  const commands = [];
  const stub = { registerTool: (d) => tools.push(d), registerCommand: (n) => commands.push(n) };
  const mod = await import("../.pi/extensions/workflow.ts");
  mod.default(stub);
  assert.deepEqual(tools.map((t) => t.name).sort(), ["mcp_capabilities", "mcp_invoke"]);
  assert.deepEqual(commands, ["workflow"]);
  assert.ok(tools.every((t) => typeof t.execute === "function"));
});

test("extension: mcp_invoke dispatches through the host bridge", async () => {
  const prev = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = "test";
  try {
    const tool = createMcpInvokeTool(() => BOTH);
    const result = await tool.execute("1", { server: "exa", tool: "search", args: { query: "x" } }, undefined);
    assert.equal(result.details.code, "dispatch-ready");
    assert.equal(result.details.plan.ref, "mcp.$call");
  } finally {
    if (prev === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = prev;
  }
});

test("extension: mcp_invoke reports unavailable providers actionably", async () => {
  const tool = createMcpInvokeTool(() => BOTH);
  const result = await tool.execute("2", { server: "missing", tool: "x" }, undefined);
  assert.equal(result.details.code, "provider-unavailable");
  assert.match(result.content[0].text, /\.mcporter/);
});

test("extension: mcp_invoke honors cancellation", async () => {
  const tool = createMcpInvokeTool(() => BOTH);
  const ctrl = new AbortController();
  ctrl.abort();
  const result = await tool.execute("3", { server: "exa", tool: "search" }, ctrl.signal);
  assert.equal(result.details.code, "cancelled");
});

test("extension: mcp_capabilities is read-only and reports fallback", async () => {
  const tool = createMcpCapabilitiesTool(() => BOTH);
  const result = await tool.execute("4", {});
  assert.equal(result.details.code, "ok");
  assert.match(result.content[0].text, /mcp\.\$search/);
});

test("extension: workflow status reflects lifecycle and assets", () => {
  const status = buildWorkflowStatus(process.cwd());
  assert.match(status, /^Prewalk:/m);
  assert.match(status, /Skills:/m);
  assert.match(status, /MCP ready:/m);
});
