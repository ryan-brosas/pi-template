// Shared pure helpers for the pi.dev template: MCP routing, prewalk-contract
// mirror, and secret scanning. Single source of truth used by validators,
// tests, and the project extension (via relative import).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const EXAMPLE_PROVIDERS = ["exa", "deepwiki"] as const;
export const FALLBACK_MCP_SEARCH = "mcp.$search";

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

export type DispatchOutcome =
  | { ok: true; plan: { ref: "mcp.$call"; args: { server: string; tool: string; args: unknown } } }
  | {
      ok: false;
      code: "cancelled" | "provider-unavailable" | "missing-secret" | "empty-args";
      server?: string;
      tool?: string;
      guidance: string;
    };

export function resolveDispatch(input: {
  server: string;
  tool: string;
  args?: unknown;
  config: McpConfig;
  signal?: AbortSignal | undefined;
}): DispatchOutcome {
  const { server, tool, config, signal } = input;
  if (signal?.aborted) {
    return { ok: false, code: "cancelled", server, tool, guidance: "Dispatch was cancelled before it began." };
  }
  const servers = config.mcpServers ?? {};
  const entry = servers[server];
  if (!entry) {
    return {
      ok: false,
      code: "provider-unavailable",
      server,
      tool,
      guidance:
        'MCP server "' + server + '" is not configured. Add it to .mcporter/config.json (see mcp/*.example.json) or use generic discovery via ' + FALLBACK_MCP_SEARCH + '.',
    };
  }
  const missing = requiredEnvNames(entry).filter((k) => {
    const v = process.env[k];
    return v === undefined || v === "";
  });
  if (missing.length > 0) {
    return {
      ok: false,
      code: "missing-secret",
      server,
      tool,
      guidance:
        'MCP server "' + server + '" is configured but requires environment secrets ' + missing.join(", ") + '. Set them (see .env.example) and reload.',
    };
  }
  if (!tool || !tool.trim()) {
    return { ok: false, code: "empty-args", server, tool, guidance: "A tool name is required on the MCP server." };
  }
  return { ok: true, plan: { ref: "mcp.$call", args: { server, tool, args: input.args ?? {} } } };
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
