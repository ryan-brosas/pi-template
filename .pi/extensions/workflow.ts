// pi.dev Fabric template extension: provider-neutral research capability status
// and guidance. The extension never executes research: MCP servers are executed
// by the host MCP bridge (mcporter) and surfaced as host tools (mcp.$search /
// mcp.$call, or tools.search / tools.call from Fabric). It only reports status
// and returns exact refs.
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  buildResearchGuidance,
  listMcpCapabilities,
  parseMcpConfig,
  providerStatus,
  readJsonFile,
  type McpConfig,
} from "../../scripts/template-lib.ts";

const ResearchGuidanceParams = Type.Object({
  intent: Type.Optional(Type.String({ description: "Research intent text; routed to a lane (library docs, repository, web facts)" })),
  provider: Type.Optional(Type.String({ description: "Optional provider name to inspect: omniroute, context7, deepwiki" })),
  query: Type.Optional(Type.String({ description: "Optional query text; used for intent routing" })),
});

export function readResearchConfig(root: string = process.cwd()): McpConfig {
  const candidates = [resolve(root, ".mcporter", "config.json"), resolve(homedir(), ".config", "mcp", "mcp.json"), resolve(root, "mcporter.json")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const v = readJsonFile(candidate);
      if (v && typeof v === "object" && !Array.isArray(v)) return v as McpConfig;
    }
  }
  return parseMcpConfig(undefined);
}

export function createWorkflowStatusTool(loadConfig: () => McpConfig) {
  return {
    name: "workflow_status",
    label: "Workflow status",
    description:
      "Report template state: prewalk lifecycle config, discovered skills by pack, prompts, extensions, and research provider status (omniroute, context7, deepwiki) with ready/degraded status and exact host refs. Read-only.",
    parameters: Type.Object({}),
    async execute(): Promise<AgentToolResult<unknown>> {
      const text = buildWorkflowStatusText(process.cwd(), loadConfig());
      return { content: [{ type: "text" as const, text }], details: { code: "ok" } };
    },
  };
}

export function createResearchGuidanceTool(loadConfig: () => McpConfig) {
  return {
    name: "research_guidance",
    label: "Research guidance",
    description:
      "Return provider-neutral research guidance: which lane fits the intent (library docs, repository Q&A, general web), whether omniroute/context7/deepwiki are configured and ready, and the exact host tools to call. Read-only; never fabricates execution.",
    parameters: ResearchGuidanceParams,
    async execute(
      _toolCallId: string,
      params: { intent?: string; provider?: string; query?: string },
    ): Promise<AgentToolResult<unknown>> {
      const g = buildResearchGuidance(loadConfig(), {
        intent: params.intent,
        provider: params.provider,
        query: params.query,
      });
      return {
        content: [{ type: "text" as const, text: g.guidance }],
        details: {
          code: "guidance",
          lane: g.lane.lane,
          provider: g.lane.provider,
          refs: g.refs,
          providers: g.providers.map((p) => ({ name: p.name, configured: p.configured, aliasUsed: p.aliasUsed, envMissing: p.envMissing })),
        },
      };
    },
  };
}

export function buildWorkflowStatusText(root: string, config: McpConfig): string {
  const fabric = (readJsonFile(resolve(root, ".pi", "fabric.json")) ?? {}) as Record<string, unknown>;
  const prewalk = (fabric.prewalk ?? {}) as Record<string, unknown>;
  const skillsRoot = resolve(root, ".pi", "skills");
  let skillList: string[] = [];
  const packCounts: Record<string, number> = {};
  if (existsSync(skillsRoot)) {
    for (const pack of readdirSync(skillsRoot)) {
      const packDir = resolve(skillsRoot, pack);
      if (!existsSync(resolve(packDir, "SKILL.md")) && existsSync(packDir) && readdirSync(packDir, { withFileTypes: true }).some((e) => e.isDirectory())) {
        const names = readdirSync(packDir)
          .filter((n) => existsSync(resolve(packDir, n, "SKILL.md")))
          .sort();
        packCounts[pack] = names.length;
        skillList.push(...names.map((n) => pack + "/" + n));
      } else if (existsSync(resolve(packDir, "SKILL.md"))) {
        skillList.push(pack);
      }
    }
  }
  skillList = skillList.sort();
  const caps = listMcpCapabilities(config);
  const providers = providerStatus(config);
  const providerLine = providers
    .map((p) => {
      if (!p.configured) return p.name + " (not configured)";
      const missing = p.envMissing.length > 0 ? " degraded: missing " + p.envMissing.join(",") : " ready";
      return p.name + " (" + missing + (p.aliasUsed ? ", alias \"" + p.aliasUsed + "\"" : "") + ")";
    })
    .join(" | ");
  const packLine = Object.keys(packCounts).length > 0 ? Object.entries(packCounts).map(([p, c]) => p + "=" + c).join(", ") : "none";
  return [
    "Prewalk: " + String(prewalk.verificationMode ?? "unset") + " | arm: " + String(prewalk.arm ?? "unset") + " | model: " + String(prewalk.model ?? "unset"),
    "Skill packs: " + packLine + " (" + skillList.length + " skills)",
    "Prompts: " + (existsSync(resolve(root, ".pi", "prompts")) ? readdirSync(resolve(root, ".pi", "prompts")).filter((f) => f.endsWith(".md")).sort().join(", ") : "none"),
    "Extensions: " + (existsSync(resolve(root, ".pi", "extensions")) ? readdirSync(resolve(root, ".pi", "extensions")).filter((f) => f.endsWith(".ts")).sort().join(", ") : "none"),
    "Research providers: " + (providerLine || "none") + " | servers: " + (caps.servers.length > 0 ? caps.servers.join(", ") : "none") + " | fallback: " + caps.fallback,
    "Host research refs: mcp.$search, mcp.$call, mcp.context7.query-docs, mcp.exa.omniroute_web_search, mcp.exa.omniroute_web_fetch, mcp.deepwiki.read_wiki_contents, mcp.deepwiki.ask_question (or tools.search / tools.call from Fabric)",
  ].join("\n");
}

export default function workflowExtension(pi: ExtensionAPI): void {
  pi.registerTool(createWorkflowStatusTool(() => readResearchConfig()));
  pi.registerTool(createResearchGuidanceTool(() => readResearchConfig()));
  pi.registerCommand("workflow", {
    description: "Show template workflow status: prewalk lifecycle, skill packs, prompts, extensions, and research providers",
    handler: async (_args, ctx) => {
      ctx.ui.notify(buildWorkflowStatusText(process.cwd(), readResearchConfig()), "info");
    },
  });
}
