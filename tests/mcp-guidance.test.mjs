import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMcpGuidance, listMcpCapabilities, providerStatus, parseMcpConfig, scanForSecrets, FALLBACK_MCP_SEARCH, MCP_CALL_REF } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const BOTH = {
  mcpServers: {
    exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } },
    deepwiki: { url: "https://mcp.deepwiki.com/mcp", headers: { Authorization: "Bearer ${DEEPWIKI_API_KEY}" } }
  }
};
const ONE = { mcpServers: { exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } } } };

test("mcp-guidance: both providers listed with host-tool refs and generic fallback", () => {
  const caps = listMcpCapabilities(BOTH);
  assert.deepEqual(caps.servers, ["deepwiki", "exa"]);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
  assert.equal(providerStatus(BOTH).filter((p) => p.configured).length, 2);
});

test("mcp-guidance: one provider degrades the other without losing fallback", () => {
  const caps = listMcpCapabilities(ONE);
  assert.deepEqual(caps.servers, ["exa"]);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
  assert.equal(providerStatus(ONE).find((p) => p.name === "deepwiki")?.configured, false);
});

test("mcp-guidance: no providers still yields empty capabilities plus fallback", () => {
  const caps = listMcpCapabilities({});
  assert.deepEqual(caps.servers, []);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
});

test("mcp-guidance: guidance points to host bridge tools, never a fake plan", () => {
  const g = buildMcpGuidance(BOTH, { server: "exa", tool: "search" });
  assert.deepEqual(g.refs, [FALLBACK_MCP_SEARCH, MCP_CALL_REF]);
  assert.match(g.guidance, /host MCP bridge/);
  assert.match(g.guidance, /tools\.search and tools\.call/);
  assert.equal(/dispatch[- ]ready/i.test(g.guidance), false);
});

test("mcp-guidance: unconfigured provider gets actionable configuration guidance", () => {
  const g = buildMcpGuidance(BOTH, { server: "missing", tool: "x" });
  assert.match(g.guidance, /\.mcporter/);
  assert.match(g.guidance, /mcp\.\$search/);
  assert.ok(!g.servers.includes("missing"));
});

test("mcp-guidance: examples parse and carry no committed secrets", () => {
  const names = ["exa.example.json", "deepwiki.example.json"];
  for (const f of names) {
    const cfg = parseMcpConfig(readFileSync(join(root, "mcp", f), "utf8"));
    assert.ok(cfg.mcpServers && Object.keys(cfg.mcpServers).length === 1, f);
  }
  const findings = scanForSecrets(join(root, "mcp"));
  assert.deepEqual(findings, []);
});
