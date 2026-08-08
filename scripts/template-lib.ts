// Shared pure helpers for the pi.dev Fabric template: MCP guidance, source
// provenance, prewalk-contract mirror, frontmatter parsing, and secret scanning.
// Single source of truth used by validators, tests, and the project extension.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

export const EXAMPLE_PROVIDERS = ["exa", "deepwiki"] as const;
export const FALLBACK_MCP_SEARCH = "mcp.$search";
export const MCP_CALL_REF = "mcp.$call";

export type McpServerEntry = {
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
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

export type ProviderStatus = {
  name: string;
  configured: boolean;
  envKeys: string[];
  envPresent: string[];
  envMissing: string[];
};

export function providerStatus(config: McpConfig): ProviderStatus[] {
  const servers = config.mcpServers ?? {};
  return EXAMPLE_PROVIDERS.map((name) => {
    const entry = servers[name];
    const envKeys = entry ? requiredEnvNames(entry) : [];
    const envPresent = envKeys.filter((k) => {
      const v = process.env[k];
      return v !== undefined && v !== "";
    });
    const envMissing = envKeys.filter((k) => !envPresent.includes(k));
    return { name, configured: Boolean(entry), envKeys, envPresent, envMissing };
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
  const known = new Set<string>(EXAMPLE_PROVIDERS);
  const unknown = names.filter((n) => !known.has(n));
  return { servers: names, ready, degraded, unknown, fallback: FALLBACK_MCP_SEARCH };
}

export type McpGuidance = {
  refs: string[];
  guidance: string;
  servers: string[];
  ready: string[];
  degraded: Array<{ name: string; missing: string[] }>;
};

// Honest guidance: MCP calls are executed by the host MCP bridge (mcporter) and
// surfaced to the model as host tools (mcp.$search / mcp.$call) or via Fabric's
// tools.search / tools.call. This helper never fabricates a dispatch plan.
export function buildMcpGuidance(
  config: McpConfig,
  opts: { server?: string; tool?: string; query?: string } = {},
): McpGuidance {
  const caps = listMcpCapabilities(config);
  const parts: string[] = [];
  parts.push("MCP servers are executed by the host MCP bridge (mcporter) and exposed as host tools.");
  if (opts.server && !caps.servers.includes(opts.server)) {
    parts.push(
      'Server "' + opts.server + '" is not configured. Add it to .mcporter/config.json (see mcp/*.example.json) or use generic discovery via ' + FALLBACK_MCP_SEARCH + '.',
    );
  } else if (opts.server) {
    const degraded = caps.degraded.find((d) => d.name === opts.server);
    parts.push(
      'Server "' + opts.server + '" is configured' +
        (degraded ? ' but requires env secrets ' + degraded.missing.join(", ") + " (see .env.example)" : " and ready") +
        ".",
    );
  }
  parts.push("Use the host tool " + FALLBACK_MCP_SEARCH + " for discovery, or " + MCP_CALL_REF + " with { server, tool, args } to call a configured server.");
  parts.push("From a Fabric run, the same bridge is reachable via tools.search and tools.call.");
  return {
    refs: [FALLBACK_MCP_SEARCH, MCP_CALL_REF],
    guidance: parts.join(" "),
    servers: caps.servers,
    ready: caps.ready,
    degraded: caps.degraded,
  };
}

// Mirror of Ultra Fabric's research-prewalk checklist contract so the template
// can pin the lifecycle seam with executable tests without importing the host.
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

// Lenient Agent Skills frontmatter parser: handles folded (>- / |-) descriptions
// by joining indented continuation lines.
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
