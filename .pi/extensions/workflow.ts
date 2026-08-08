// pi.dev template extension: workflow status + safe MCP capability
// discovery/dispatch. Minimal by design: registers two tools and one command
// and never mutates the workspace. MCP execution is delegated to the host MCP
// bridge (mcp.$call) through the returned dispatch plan; this extension only
// validates, cancels, and guides.
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  listMcpCapabilities,
  parseMcpConfig,
  readJsonFile,
  resolveDispatch,
  type McpConfig,
} from "../../scripts/template-lib.ts";

const McpInvokeParams = Type.Object({
  server: Type.String({ description: "MCP server name, e.g. exa or deepwiki" }),
  tool: Type.String({ description: "Tool name on that server" }),
  args: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "Tool arguments" })),
  timeoutMs: Type.Optional(Type.Integer({ minimum: 1000, maximum: 120000, description: "Optional dispatch timeout in ms" })),
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

export function createMcpInvokeTool(loadConfig: () => McpConfig) {
  return {
    name: "mcp_invoke",
    label: "MCP invoke",
    description:
      "Validate and dispatch a call to a configured MCP server through the host MCP bridge (mcp.$call). Returns an actionable error when the provider is unavailable, unconfigured, or missing required environment secrets. Cancellable via the execution signal. Never writes files.",
    parameters: McpInvokeParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof McpInvokeParams>,
      signal: AbortSignal | undefined,
    ): Promise<AgentToolResult<unknown>> {
      const outcome = resolveDispatch({
        server: params.server,
        tool: params.tool,
        args: params.args,
        config: loadConfig(),
        signal: signal ?? undefined,
      });
      if (!outcome.ok) {
        return {
          content: [{ type: "text" as const, text: outcome.guidance }],
          details: { code: outcome.code, server: outcome.server ?? null, tool: outcome.tool ?? null },
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text:
              "Dispatch ready. Execute through the host MCP bridge: ref " + outcome.plan.ref + " with args " + JSON.stringify(outcome.plan.args),
          },
        ],
        details: { code: "dispatch-ready", plan: outcome.plan },
      };
    },
  };
}

export function createMcpCapabilitiesTool(loadConfig: () => McpConfig) {
  return {
    name: "mcp_capabilities",
    label: "MCP capabilities",
    description:
      "List configured MCP servers, which optional example providers are ready or degraded (missing env secrets), and the generic fallback. Read-only.",
    parameters: Type.Object({}),
    async execute(): Promise<AgentToolResult<unknown>> {
      const caps = listMcpCapabilities(loadConfig());
      return { content: [{ type: "text" as const, text: JSON.stringify(caps, null, 2) }], details: { code: "ok", capabilities: caps } };
    },
  };
}

export function buildWorkflowStatus(root: string = process.cwd()): string {
  const fabric = (readJsonFile(resolve(root, ".pi", "fabric.json")) ?? {}) as Record<string, unknown>;
  const prewalk = (fabric.prewalk ?? {}) as Record<string, unknown>;
  const skillsDir = resolve(root, ".pi", "skills");
  const promptsDir = resolve(root, ".pi", "prompts");
  const extensionsDir = resolve(root, ".pi", "extensions");
  let skills: string[] = [];
  if (existsSync(skillsDir)) {
    skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(resolve(skillsDir, e.name, "SKILL.md")))
      .map((e) => e.name)
      .sort();
  }
  const prompts = existsSync(promptsDir) ? readdirSync(promptsDir).filter((f) => f.endsWith(".md")).sort() : [];
  const extensions = existsSync(extensionsDir) ? readdirSync(extensionsDir).filter((f) => f.endsWith(".ts")).sort() : [];
  const caps = listMcpCapabilities(readMcpConfig(root));
  return [
    "Prewalk: " + String(prewalk.verificationMode ?? "unset") + " | arm: " + String(prewalk.arm ?? "unset") + " | model: " + String(prewalk.model ?? "unset"),
    "Skills: " + (skills.length > 0 ? skills.join(", ") : "none"),
    "Prompts: " + (prompts.length > 0 ? prompts.join(", ") : "none"),
    "Extensions: " + (extensions.length > 0 ? extensions.join(", ") : "none"),
    "MCP ready: " + (caps.ready.length > 0 ? caps.ready.join(", ") : "none") +
      " | degraded: " + (caps.degraded.length > 0 ? caps.degraded.map((d) => d.name + " (missing " + d.missing.join(",") + ")").join("; ") : "none") +
      " | fallback: " + caps.fallback,
  ].join("\n");
}

export default function workflowExtension(pi: ExtensionAPI): void {
  pi.registerTool(createMcpInvokeTool(() => readMcpConfig()));
  pi.registerTool(createMcpCapabilitiesTool(() => readMcpConfig()));
  pi.registerCommand("workflow", {
    description: "Show template workflow status: prewalk lifecycle, skills, prompts, extension, and MCP providers",
    handler: async (_args, ctx) => {
      ctx.ui.notify(buildWorkflowStatus(), "info");
    },
  });
}
