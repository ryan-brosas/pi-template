import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { listMcpCapabilities, providerStatus, parseMcpConfig, resolveDispatch, scanForSecrets, FALLBACK_MCP_SEARCH } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const BOTH = {
  mcpServers: {
    exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } },
    deepwiki: { url: "https://mcp.deepwiki.com/mcp", headers: { Authorization: "Bearer ${DEEPWIKI_API_KEY}" } }
  }
};
const ONE = { mcpServers: { exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: { EXA_API_KEY: "${EXA_API_KEY}" } } } };

test("mcp-routing: both providers configured and listed with generic fallback", () => {
  const caps = listMcpCapabilities(BOTH);
  assert.deepEqual(caps.servers, ["deepwiki", "exa"]);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
  assert.equal(providerStatus(BOTH).filter((p) => p.configured).length, 2);
});

test("mcp-routing: one provider degrades the other without losing fallback", () => {
  const caps = listMcpCapabilities(ONE);
  assert.deepEqual(caps.servers, ["exa"]);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
  assert.equal(providerStatus(ONE).find((p) => p.name === "deepwiki")?.configured, false);
});

test("mcp-routing: no providers still yields empty capabilities plus fallback", () => {
  const caps = listMcpCapabilities({});
  assert.deepEqual(caps.servers, []);
  assert.equal(caps.fallback, FALLBACK_MCP_SEARCH);
});

test("mcp-routing: dispatch plan targets the host MCP bridge", () => {
  const prev = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = "test";
  try {
    const out = resolveDispatch({ server: "exa", tool: "search", args: { query: "x" }, config: BOTH });
    assert.equal(out.ok, true);
    if (out.ok) {
      assert.equal(out.plan.ref, "mcp.$call");
      assert.equal(out.plan.args.server, "exa");
      assert.equal(out.plan.args.tool, "search");
    }
  } finally {
    if (prev === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = prev;
  }
});

test("mcp-routing: unconfigured provider is actionable, not silent", () => {
  const out = resolveDispatch({ server: "missing", tool: "x", config: BOTH });
  assert.equal(out.ok, false);
  if (!out.ok) {
    assert.equal(out.code, "provider-unavailable");
    assert.match(out.guidance, /\.mcporter/);
    assert.match(out.guidance, /mcp\.\$search/);
  }
});

test("mcp-routing: missing environment secret blocks dispatch", () => {
  const prev = process.env.EXA_API_KEY;
  delete process.env.EXA_API_KEY;
  try {
    const out = resolveDispatch({ server: "exa", tool: "search", config: BOTH });
    assert.equal(out.ok, false);
    if (!out.ok) assert.equal(out.code, "missing-secret");
  } finally {
    if (prev === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = prev;
  }
});

test("mcp-routing: cancellation wins over dispatch", () => {
  const ctrl = new AbortController();
  ctrl.abort();
  const out = resolveDispatch({ server: "exa", tool: "search", config: BOTH, signal: ctrl.signal });
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.code, "cancelled");
});

test("mcp-routing: examples parse and carry no committed secrets", () => {
  const names = ["exa.example.json", "deepwiki.example.json"];
  for (const f of names) {
    const cfg = parseMcpConfig(readFileSync(join(root, "mcp", f), "utf8"));
    assert.ok(cfg.mcpServers && Object.keys(cfg.mcpServers).length === 1, f);
  }
  const findings = scanForSecrets(join(root, "mcp"));
  assert.deepEqual(findings, []);
  const env = readFileSync(join(root, ".env.example"), "utf8");
  for (const m of env.matchAll(/^([A-Z0-9_]+)=/gm)) assert.equal(m[0].trim().endsWith("="), true, m[1] + " must be empty in .env.example");
});
