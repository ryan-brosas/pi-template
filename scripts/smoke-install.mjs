import { mkdtempSync, existsSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const repo = process.cwd();
const EXCLUDE = ["node_modules", ".git", ".pi/fabric", ".pi/hindsight", "package-lock.json"];

export async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "pi-template-smoke-"));
  const lines = [];
  try {
    for (const name of ["package.json", "tsconfig.json", ".gitignore", ".env.example", "README.md", ".pi", "mcp", "scripts", "tests", "docs", "sources"]) {
      if (!existsSync(join(repo, name))) throw new Error("template missing top-level entry: " + name);
      cpSync(join(repo, name), join(tmp, name), {
        recursive: true,
        filter: (src) => {
          const rel = src.slice(repo.length + 1);
          return !EXCLUDE.some((x) => rel === x || rel.startsWith(x + "/"));
        },
      });
    }
    execFileSync("git", ["init", "-q"], { cwd: tmp });
    execFileSync("git", ["add", "-A"], { cwd: tmp });
    execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--silent"], { cwd: tmp });
    for (const v of ["validate-structure", "validate-config", "validate-skills", "validate-workflows", "validate-prompts", "validate-mcp", "validate-sources", "scan-secrets"]) {
      const out = execFileSync("node", ["scripts/" + v + ".mjs"], { cwd: tmp, encoding: "utf8" });
      lines.push("validator " + v + ": " + out.trim().split("\n")[0]);
    }
    const tools = [];
    const commands = [];
    const stub = { registerTool: (d) => tools.push(d.name), registerCommand: (n) => commands.push(n) };
    const url = pathToFileURL(join(tmp, ".pi", "extensions", "workflow.ts")).href + "?t=" + Date.now();
    const mod = await import(url);
    mod.default(stub);
    if (tools.length !== 2 || commands.length !== 1) throw new Error("extension registration mismatch: tools=" + tools.join(",") + " commands=" + commands.join(","));
    lines.push("extension loaded: tools [" + tools.join(", ") + "] + command /" + commands.join(", /"));
    const testOut = execFileSync("node", ["--test", "tests/*.test.mjs"], { cwd: tmp, encoding: "utf8" });
    const passMatch = /\u2139 pass (\d+)/.exec(testOut);
    lines.push("tests: " + (passMatch ? passMatch[1] + " tests pass in temp project" : "test output present"));
    const status = execFileSync("git", ["status", "--short"], { cwd: tmp, encoding: "utf8" }).trim();
    const runtime = status.split("\n").filter((l) => /\.pi\/(fabric|hindsight)\/|\.pi\/(fabric|hindsight)$/.test(l));
    if (runtime.length > 0) throw new Error("runtime state leaked into temp project: " + runtime.join("; "));
    lines.push("clean worktree in temp project (no .pi/fabric or .pi/hindsight)");
    return { ok: true, message: "smoke:install: OK — " + lines.join(" | ") };
  } catch (err) {
    return { ok: false, message: "smoke:install: FAIL — " + (err instanceof Error ? err.message : String(err)) + " (temp dir kept: " + tmp + ")" };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const r = await main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
