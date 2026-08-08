// pi.dev Fabric template extension: honest workflow/asset status and MCP
// guidance. The extension never executes or fabricates MCP dispatch: MCP
// servers are called by the host MCP bridge (mcporter) and exposed as host
// tools (mcp.$search / mcp.$call) or via Fabric's tools.search / tools.call.
// This extension only reports status and returns guidance.
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMcpGuidance,
  listMcpCapabilities,
  parseMcpConfig,
  readJsonFile,
  type McpConfig,
} from "../../scripts/template-lib.ts";

const McpGuidanceParams = Type.Object({
  server: Type.Optional(Type.String({ description: "Optional MCP server name to check, e.g. exa or deepwiki" })),
  tool: Type.Optional(Type.String({ description: "Optional tool name the model wants to call" })),
  query: Type.Optional(Type.String({ description: "Optional search query to route via mcp.$search" })),
});

export function readMcpConfig(root: string = process.cwd()): McpConfig {
  for (const candidate of [resolve(root, ".mcporter", "config.json"), resolve(root, "mcporter.json")]) {
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
      "Report template state: prewalk lifecycle config, discovered skills, prompts, workflows, extensions, and configured MCP servers with ready/degraded status. Read-only.",
    parameters: Type.Object({}),
    async execute(): Promise<AgentToolResult<unknown>> {
      const status = buildWorkflowStatusText(process.cwd(), loadConfig());
      return { content: [{ type: "text" as const, text: status }], details: { code: "ok" } };
    },
  };
}

export function createMcpGuidanceTool(loadConfig: () => McpConfig) {
  return {
    name: "mcp_guidance",
    label: "MCP guidance",
    description:
      "Return honest guidance for calling MCP servers through the host MCP bridge: which host tools to use (mcp.$search / mcp.$call, or tools.search / tools.call from Fabric), whether a server is configured and ready, and which env secrets are missing. Read-only; never fabricates execution.",
    parameters: McpGuidanceParams,
    async execute(
      _toolCallId: string,
      params: { server?: string; tool?: string; query?: string },
    ): Promise<AgentToolResult<unknown>> {
      const guidance = buildMcpGuidance(loadConfig(), {
        server: params.server,
        tool: params.tool,
        query: params.query,
      });
      return {
        content: [{ type: "text" as const, text: guidance.guidance }],
        details: { code: "guidance", refs: guidance.refs, servers: guidance.servers, ready: guidance.ready, degraded: guidance.degraded },
      };
    },
  };
}

export function buildWorkflowStatusText(root: string, config: McpConfig): string {
  const fabric = (readJsonFile(resolve(root, ".pi", "fabric.json")) ?? {}) as Record<string, unknown>;
  const prewalk = (fabric.prewalk ?? {}) as Record<string, unknown>;
  const listDirs = (dir: string, ext: string): string[] => {
    const full = resolve(root, dir);
    if (!existsSync(full)) return [];
    if (ext === "skill") {
      return readdirSync(full, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(resolve(full, e.name, "SKILL.md")))
        .map((e) => e.name)
        .sort();
    }
    return readdirSync(full).filter((f) => f.endsWith(ext)).sort();
  };
  const caps = listMcpCapabilities(config);
  return [
    "Prewalk: " + String(prewalk.verificationMode ?? "unset") + " | arm: " + String(prewalk.arm ?? "unset") + " | model: " + String(prewalk.model ?? "unset"),
    "Skills: " + (listDirs(".pi/skills", "skill").length > 0 ? listDirs(".pi/skills", "skill").join(", ") : "none"),
    "Prompts: " + (listDirs(".pi/prompts", ".md").length > 0 ? listDirs(".pi/prompts", ".md").join(", ") : "none"),
    "Extensions: " + (listDirs(".pi/extensions", ".ts").length > 0 ? listDirs(".pi/extensions", ".ts").join(", ") : "none"),
    "MCP configured: " + (caps.servers.length > 0 ? caps.servers.join(", ") : "none") +
      " | ready: " + (caps.ready.length > 0 ? caps.ready.join(", ") : "none") +
      " | degraded: " + (caps.degraded.length > 0 ? caps.degraded.map((d) => d.name + " (missing " + d.missing.join(",") + ")").join("; ") : "none") +
      " | host tools: mcp.$search, mcp.$call (or tools.search / tools.call from Fabric)",
  ].join("\n");
}

export default function workflowExtension(pi: ExtensionAPI): void {
  pi.registerTool(createWorkflowStatusTool(() => readMcpConfig()));
  pi.registerTool(createMcpGuidanceTool(() => readMcpConfig()));
  pi.registerCommand("workflow", {
    description: "Show template workflow status: prewalk lifecycle, skills, prompts, extensions, and MCP providers",
    handler: async (_args, ctx) => {
      ctx.ui.notify(buildWorkflowStatusText(process.cwd(), readMcpConfig()), "info");
    },
  });
}
