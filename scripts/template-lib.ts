// Shared pure helpers for the pi.dev Fabric template: research lane routing,
// provider status, source provenance, prewalk-contract mirror, frontmatter
// parsing, and secret scanning. Single source of truth for validators, tests,
// and the project extension.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

export const FALLBACK_MCP_SEARCH = "mcp.$search";
export const MCP_CALL_REF = "mcp.$call";

// Canonical research lanes. OmniRoute is the primary general-web/fetch lane and
// is reached through a local MCP endpoint; the legacy global alias for it is
// "exa" (an OmniRoute transport, not the standalone Exa product). Context7 is
// the authoritative library-docs lane; DeepWiki the public-repository Q&A lane.
export type ResearchLane = {
  name: string;
  lane: "general-web" | "library-docs" | "repo-qa";
  aliases: string[];
  refs: string[];
  note: string;
};

export const RESEARCH_LANES: ResearchLane[] = [
  {
    name: "omniroute",
    lane: "general-web",
    aliases: ["exa"],
    refs: ["mcp.exa.omniroute_web_search", "mcp.exa.omniroute_web_fetch"],
    note: "primary general web search and URL fetch via OmniRoute's gateway (provider failover; Exa may be one backend).",
  },
  {
    name: "context7",
    lane: "library-docs",
    aliases: [],
    refs: ["mcp.context7.query-docs"],
    note: "authoritative up-to-date library/API documentation; resolve a library ID first, then query a topic.",
  },
  {
    name: "deepwiki",
    lane: "repo-qa",
    aliases: [],
    refs: ["mcp.deepwiki.read_wiki_contents", "mcp.deepwiki.ask_question"],
    note: "repository Q&A for unfamiliar public repositories; not a general web search lane.",
  },
];

export type McpServerEntry = {
  command?: string;
  args?: string[];
  url?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  allowedTools?: string[];
};

export type McpConfig = { mcpServers?: Record<string, McpServerEntry> };

export function parseMcpConfig(text: string | null | undefined): McpConfig {
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as McpConfig;
  } catch {
    /* not JSON; treat as empty */
  }
  return {};
}

export function readJsonFile(path: string): unknown | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

export function requiredEnvNames(entry: McpServerEntry | undefined): string[] {
  const names = new Set<string>();
  for (const raw of [...Object.values(entry?.env ?? {}), ...Object.values(entry?.headers ?? {})]) {
    const m = /\$\{?([A-Z0-9_]+)\}?/.exec(String(raw ?? ""));
    if (m?.[1]) names.add(m[1]);
  }
  return [...names];
}

// Resolve the config entry for a canonical lane, accepting its legacy aliases.
export function laneEntry(config: McpConfig, lane: ResearchLane): McpServerEntry | undefined {
  const servers = config.mcpServers ?? {};
  const alias = lane.aliases[0];
  return servers[lane.name] ?? (alias ? servers[alias] : undefined);
}

export type ProviderStatus = {
  name: string;
  lane: ResearchLane["lane"];
  configured: boolean;
  aliasUsed: string | null;
  envKeys: string[];
  envMissing: string[];
  refs: string[];
};

export function providerStatus(config: McpConfig): ProviderStatus[] {
  return RESEARCH_LANES.map((lane) => {
    const entry = laneEntry(config, lane);
    const servers = config.mcpServers ?? {};
    const alias = lane.aliases[0];
    const aliasUsed = servers[lane.name] ? null : alias && servers[alias] ? alias : null;
    const envKeys = entry ? requiredEnvNames(entry) : [];
    const envMissing = envKeys.filter((k) => {
      const v = process.env[k];
      return v === undefined || v === "";
    });
    return { name: lane.name, lane: lane.lane, configured: Boolean(entry), aliasUsed, envKeys, envMissing, refs: lane.refs };
  });
}

export type CapabilityReport = {
  servers: string[];
  ready: string[];
  degraded: Array<{ name: string; missing: string[] }>;
  unknown: string[];
  fallback: string;
};

export function listMcpCapabilities(config: McpConfig): CapabilityReport {
  const servers = config.mcpServers ?? {};
  const names = Object.keys(servers).sort();
  const providers = providerStatus(config);
  const ready = providers.filter((p) => p.configured && p.envMissing.length === 0).map((p) => p.name);
  const degraded = providers
    .filter((p) => p.configured && p.envMissing.length > 0)
    .map((p) => ({ name: p.name, missing: p.envMissing }));
  const known = new Set<string>(RESEARCH_LANES.flatMap((l) => [l.name, ...l.aliases]));
  const unknown = names.filter((n) => !known.has(n));
  return { servers: names, ready, degraded, unknown, fallback: FALLBACK_MCP_SEARCH };
}

export type IntentLane = {
  lane: ResearchLane["lane"];
  provider: string;
  refs: string[];
  fallback: string;
  note: string;
};

// Deterministic research-intent routing. Library/API docs -> Context7;
// public-repository architecture -> DeepWiki; current web facts / URL fetch ->
// OmniRoute; local code -> CGC/codemap (never external search).
export function researchIntent(text: string): IntentLane {
  const t = text.toLowerCase();
  const omni = RESEARCH_LANES[0]!;
  const ctx7 = RESEARCH_LANES[1]!;
  const deep = RESEARCH_LANES[2]!;
  if (/(library|api docs|api reference|documentation|^docs? |versioned)/.test(t)) {
    return {
      lane: "library-docs",
      provider: "context7",
      refs: ctx7.refs,
      fallback: FALLBACK_MCP_SEARCH + " then OmniRoute fetch",
      note: "resolve the library ID first, then query a topic; verify against official source when the answer is a versioned fact.",
    };
  }
  if (/(repository|repo|codebase|github .* architecture|how is .* organized|what does .* do in the .* repo)/.test(t)) {
    return {
      lane: "repo-qa",
      provider: "deepwiki",
      refs: deep.refs,
      fallback: "CGC/local clone, GitHub, then OmniRoute",
      note: "for local code, use codemap/CGC instead; DeepWiki answers are for unfamiliar public repositories only.",
    };
  }
  return {
    lane: "general-web",
    provider: "omniroute",
    refs: omni.refs,
    fallback: FALLBACK_MCP_SEARCH,
    note: "current web facts and URL fetch go through OmniRoute's gateway with automatic provider failover.",
  };
}

export type ResearchGuidance = {
  lane: IntentLane;
  providers: ProviderStatus[];
  guidance: string;
  refs: string[];
};

// Honest guidance: research is read-only and executed by the host MCP bridge
// (mcporter) through the refs returned here; this helper never fabricates
// execution and never claims the extension runs the search itself.
export function buildResearchGuidance(
  config: McpConfig,
  opts: { intent?: string; provider?: string; query?: string } = {},
): ResearchGuidance {
  const providers = providerStatus(config);
  const lane = opts.provider
    ? researchIntent(opts.provider)
    : researchIntent(opts.intent ?? opts.query ?? "");
  const parts: string[] = [];
  parts.push("Research is read-only and never bypasses prewalk.");
  parts.push("Lane: " + lane.lane + " -> " + lane.provider + " (" + lane.note + ")");
  const target = providers.find((p) => p.name === lane.provider);
  if (target) {
    if (!target.configured) {
      parts.push(
        'Provider "' + target.name + '" is not configured. Add it to .mcporter/config.json (see mcp/*.example.json) or use generic discovery via ' + FALLBACK_MCP_SEARCH + '.',
      );
    } else if (target.envMissing.length > 0) {
      parts.push('Provider "' + target.name + '" is configured but requires env secrets ' + target.envMissing.join(", ") + " (see .env.example).");
    } else {
      parts.push('Provider "' + target.name + '" is configured and ready' + (target.aliasUsed ? " (via legacy alias \"" + target.aliasUsed + "\")" : "") + ".");
    }
  }
  parts.push("Call the host tools: " + lane.refs.join(", ") + ". Discovery first via " + FALLBACK_MCP_SEARCH + "; from Fabric, the same bridge is tools.search / tools.call.");
  return { lane, providers, refs: lane.refs, guidance: parts.join(" ") };
}

// Mirror of Ultra Fabric's research-prewalk checklist contract.
export type ChecklistContract = {
  items: Array<{ task: string; validation: string }>;
  schema: {
    intent: string;
    references: Array<{ repository: string; question: string; evidenceRefs: string[] }>;
    localScope: { files: string[] };
    invariants: string[];
    postconditions: string[];
  };
};

export const MIN_CHECKLIST_ITEMS = 5;
export const MAX_CHECKLIST_ITEMS = 9;

export function validateChecklistContract(input: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const obj = input as Record<string, unknown> | null;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, errors: ["checklist must be an object with an items array"] };
  }
  const items = obj.items;
  if (!Array.isArray(items) || items.length < MIN_CHECKLIST_ITEMS || items.length > MAX_CHECKLIST_ITEMS) {
    errors.push("items must be an array of " + MIN_CHECKLIST_ITEMS + "-" + MAX_CHECKLIST_ITEMS);
  }
  (items as unknown[]).forEach((item, i) => {
    if (!item || typeof item !== "object") {
      errors.push("item " + (i + 1) + " must be an object");
      return;
    }
    const it = item as Record<string, unknown>;
    for (const field of ["task", "validation"]) {
      if (typeof it[field] !== "string" || !String(it[field]).trim()) {
        errors.push("item " + (i + 1) + " requires a concrete " + field);
      }
    }
  });
  const schema = obj.schema as Record<string, unknown> | undefined;
  if (!schema || typeof schema !== "object") {
    errors.push("schema contract required");
  } else {
    if (typeof schema.intent !== "string" || !schema.intent.trim()) errors.push("schema.intent required");
    const refs = schema.references as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(refs) || refs.length === 0) errors.push("schema.references must be a nonempty array");
    (refs ?? []).forEach((r, i) => {
      if (!r || typeof r !== "object") {
        errors.push("reference " + (i + 1) + " must be an object");
        return;
      }
      const rr = r as Record<string, unknown>;
      for (const field of ["repository", "question"]) {
        if (typeof rr[field] !== "string" || !String(rr[field]).trim()) errors.push("reference " + (i + 1) + " requires " + field);
      }
      if (!Array.isArray(rr.evidenceRefs) || (rr.evidenceRefs as unknown[]).length === 0) {
        errors.push("reference " + (i + 1) + " requires nonempty evidenceRefs");
      }
    });
    const scope = schema.localScope as Record<string, unknown> | undefined;
    if (!scope || typeof scope !== "object" || !Array.isArray(scope.files) || (scope.files as unknown[]).length === 0) {
      errors.push("schema.localScope.files must list at least one project file");
    }
    if (!Array.isArray(schema.invariants) || (schema.invariants as unknown[]).length === 0) errors.push("schema.invariants required");
    if (!Array.isArray(schema.postconditions) || (schema.postconditions as unknown[]).length === 0) errors.push("schema.postconditions required");
  }
  return { ok: errors.length === 0, errors };
}

const SECRET_ASSIGNMENT = /(?:api[_-]?key|token|secret|password|client[_-]?secret)\s*[:=]\s*(.+)$/i;

export function scanForSecrets(root: string, exclude: string[] = []): Array<{ file: string; line: number }> {
  const findings: Array<{ file: string; line: number }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(root, full);
      if (exclude.some((x) => rel === x || rel.startsWith(x + "/"))) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        try {
          const lines = readFileSync(full, "utf8").split("\n");
          lines.forEach((line, idx) => {
            const m = SECRET_ASSIGNMENT.exec(line);
            if (!m) return;
            const captured = m[1];
            if (captured === undefined) return;
            let value = captured.trim().replace(/[,"'\s]+$/, "").replace(/^["']/, "").replace(/["']$/, "");
            if (value === "") return;
            if (/\$\{[A-Z0-9_]+\}/.test(value)) return; // env-var reference, not a secret
            const normalized = value.replace(/[\s"'+,]+/g, "").replace(/[};]+$/, "");
            if (normalized.length < 8) return; // not credential-shaped
            findings.push({ file: rel, line: idx + 1 });
          });
        } catch {
          /* skip unreadable */
        }
      }
    }
  };
  if (existsSync(root)) walk(root);
  return findings;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sourcesFooter(source: string, license: string): string {
  return (
    "\n<!--\n" +
    "source: " + source + "\n" +
    "adapted: prewalk lifecycle seams only (Ultra Fabric); content otherwise preserved\n" +
    "license: " + license + "\n" +
    "-->\n"
  );
}

export type Frontmatter = { name?: string; description?: string; raw: Record<string, string> };

export function parseFrontmatter(text: string): Frontmatter | null {
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!fm) return null;
  const raw: Record<string, string> = {};
  let key: string | null = null;
  for (const line of (fm[1] ?? "").split("\n")) {
    const m = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (m && m[1] !== undefined) {
      key = m[1];
      const v = m[2] ?? "";
      raw[key] = /^["']?[>|][-+]?["']?$/.test(v.trim()) ? "" : v.trim();
    } else if (key !== null && /^\s+\S/.test(line)) {
      raw[key] = ((raw[key] ?? "") + " " + line.trim()).trim();
    }
  }
  return { name: raw.name, description: raw.description, raw };
}

export type SourceManifest = {
  roots: Record<string, string>;
  entries: Array<{
    name: string;
    source: string;
    vendorPath: string;
    license: string;
    synth: boolean;
    sourceSha256?: string;
    vendorSha256?: string;
  }>;
};

export function loadManifest(root: string): SourceManifest {
  const v = readJsonFile(join(root, "sources", "manifest.json")) as SourceManifest | undefined;
  if (!v || !Array.isArray(v.entries)) throw new Error("sources/manifest.json missing or invalid");
  return v;
}
