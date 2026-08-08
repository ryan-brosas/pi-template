import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listMcpCapabilities, providerStatus, parseMcpConfig, scanForSecrets, FALLBACK_MCP_SEARCH, EXAMPLE_PROVIDERS } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const EXA_ENV = { EXA_API_KEY: "${EXA_API_KEY}" };
const DEEP_HEADERS = { Authorization: "Bearer ${DEEPWIKI_API_KEY}" };
const BOTH = { mcpServers: { exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: EXA_ENV }, deepwiki: { url: "https://mcp.deepwiki.com/mcp", headers: DEEP_HEADERS } } };
const ONE = { mcpServers: { exa: { command: "npx", args: ["-y", "@exa/mcp-server"], env: EXA_ENV } } };
const NONE = {};

export function main() {
  const errors = [];
  const mcpDir = join(root, "mcp");
  const examples = existsSync(mcpDir) ? readdirSync(mcpDir).filter((n) => n.endsWith(".example.json")).sort() : [];
  for (const want of ["deepwiki.example.json", "exa.example.json"]) if (!examples.includes(want)) errors.push("missing mcp example: " + want);
  const serverNames = new Set();
  for (const f of examples) {
    const cfg = parseMcpConfig(readFileSync(join(mcpDir, f), "utf8"));
    for (const name of Object.keys(cfg.mcpServers || {})) serverNames.add(name);
  }
  for (const want of EXAMPLE_PROVIDERS) if (!serverNames.has(want)) errors.push("example does not declare server: " + want);
  const secrets = scanForSecrets(mcpDir);
  if (secrets.length > 0) errors.push("mcp examples contain secret assignments: " + secrets.map((s) => s.file + ":" + s.line).join(", "));
  const both = listMcpCapabilities(BOTH);
  if (both.servers.length !== 2 || both.fallback !== FALLBACK_MCP_SEARCH) errors.push("both-provider fixture: expected 2 servers + fallback " + FALLBACK_MCP_SEARCH);
  if (providerStatus(BOTH).filter((p) => p.configured).length !== 2) errors.push("both-provider fixture: both should be configured");
  const one = listMcpCapabilities(ONE);
  if (one.servers.length !== 1) errors.push("one-provider fixture: expected 1 server");
  const none = listMcpCapabilities(NONE);
  if (none.servers.length !== 0 || none.fallback !== FALLBACK_MCP_SEARCH) errors.push("no-provider fixture: expected 0 servers + fallback");
  if (errors.length > 0) return { ok: false, message: "mcp: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "mcp: OK — examples: " + examples.join(", ") + " | both/one/none fixtures pass | fallback: " + FALLBACK_MCP_SEARCH };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
