import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listMcpCapabilities, providerStatus, parseMcpConfig, scanForSecrets, buildResearchGuidance, FALLBACK_MCP_SEARCH } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const OMNI = { mcpServers: { omniroute: { baseUrl: "http://127.0.0.1:20128/api/mcp/stream", allowedTools: ["omniroute_web_search", "omniroute_web_fetch"] } } };
const ALL = {
  mcpServers: {
    omniroute: { baseUrl: "http://127.0.0.1:20128/api/mcp/stream" },
    context7: { command: "npx", args: ["-y", "@upstash/context7-mcp@3.2.5"], env: { CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}" } },
    deepwiki: { baseUrl: "https://mcp.deepwiki.com/mcp", headers: { Authorization: "Bearer ${DEEPWIKI_API_KEY}" } },
  },
};
const NONE = {};

export function main() {
  const errors = [];
  const mcpDir = join(root, "mcp");
  const examples = existsSync(mcpDir) ? readdirSync(mcpDir).filter((n) => n.endsWith(".example.json")).sort() : [];
  for (const want of ["deepwiki.example.json", "omniroute.example.json"]) if (!examples.includes(want)) errors.push("missing mcp example: " + want);
  if (examples.includes("exa.example.json")) errors.push("standalone exa example must be removed");
  const serverNames = new Set();
  for (const f of examples) {
    const cfg = parseMcpConfig(readFileSync(join(mcpDir, f), "utf8"));
    for (const name of Object.keys(cfg.mcpServers || {})) serverNames.add(name);
  }
  if (!serverNames.has("omniroute")) errors.push("omniroute example missing");
  const secrets = scanForSecrets(mcpDir);
  if (secrets.length > 0) errors.push("mcp examples contain secret assignments: " + secrets.map((s) => s.file + ":" + s.line).join(", "));
  const all = listMcpCapabilities(ALL);
  if (all.fallback !== FALLBACK_MCP_SEARCH) errors.push("generic fallback must be " + FALLBACK_MCP_SEARCH);
  if (providerStatus(ALL).filter((p) => p.configured).length !== 3) errors.push("three lanes should be configured");
  const omniOnly = listMcpCapabilities(OMNI);
  if (omniOnly.servers.length !== 1 || omniOnly.ready.includes("omniroute") !== true) errors.push("omniroute-only fixture: expected 1 ready server");
  const none = listMcpCapabilities(NONE);
  if (none.servers.length !== 0) errors.push("no-provider fixture: expected 0 servers");
  const g = buildResearchGuidance(ALL, { intent: "current news about ai agents" });
  if (g.lane.provider !== "omniroute") errors.push("general web intent must route to omniroute");
  if (g.guidance.includes("Dispatch ready") || g.guidance.includes("dispatch-ready")) errors.push("guidance must not fabricate a dispatch plan");
  if (errors.length > 0) return { ok: false, message: "mcp: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "mcp: OK — examples: " + examples.join(", ") + " | lanes omniroute/context7/deepwiki | fallback " + FALLBACK_MCP_SEARCH + " | omniroute primary" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
