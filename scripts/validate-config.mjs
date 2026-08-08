import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

export function main() {
  const errors = [];
  const fabric = (() => {
    try {
      return JSON.parse(readFileSync(join(root, ".pi", "fabric.json"), "utf8"));
    } catch {
      return null;
    }
  })();
  if (!fabric) errors.push(".pi/fabric.json missing or invalid");
  else {
    if (fabric.configVersion !== 3) errors.push("configVersion must be 3");
    const pre = fabric.prewalk || {};
    if (pre.verificationMode !== "gated") errors.push("prewalk.verificationMode must be gated");
    if (pre.arm !== "session") errors.push("prewalk.arm must be session");
    if (typeof pre.model !== "string" || pre.model.length === 0) errors.push("prewalk.model must be a nonempty string");
    if (!Number.isInteger(pre.maxPhaseRevisions) || pre.maxPhaseRevisions < 2 || pre.maxPhaseRevisions > 8) errors.push("prewalk.maxPhaseRevisions must be an integer in 2..8");
  }
  const tracked = git(["ls-files"]) || "";
  const bad = tracked.split("\n").filter((p) => p.startsWith(".pi/fabric/") || p.startsWith(".pi/hindsight/") || p === ".pi/fabric" || p === ".pi/hindsight");
  if (bad.length > 0) errors.push("runtime state tracked: " + bad.join(", "));
  const status = git(["status", "--short"]) || "";
  const bad2 = status.split("\n").filter((l) => /\.pi\/(fabric|hindsight)\/|\.pi\/(fabric|hindsight)$/.test(l));
  if (bad2.length > 0) errors.push("runtime state present in status: " + bad2.join("; "));
  if (errors.length > 0) return { ok: false, message: "config: FAIL\n  - " + errors.join("\n  - ") };
  const chain = [fabric.prewalk.model].concat(Array.isArray(fabric.prewalk.fallbackModels) ? fabric.prewalk.fallbackModels : []);
  return { ok: true, message: "config: OK — research chain: " + chain.join(" -> ") + " | mutation boundary: blocked until accepted checklist (" + fabric.prewalk.verificationMode + ", arm " + fabric.prewalk.arm + ")" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
