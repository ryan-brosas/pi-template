import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scanForSecrets } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

export function main() {
  const errors = [];
  const env = (() => {
    try {
      return readFileSync(join(root, ".env.example"), "utf8");
    } catch {
      return null;
    }
  })();
  if (!env) errors.push(".env.example missing");
  else {
    for (const line of env.split("\n")) {
      const m = /^([A-Z0-9_]+)=/.exec(line.trim());
      if (m && line.trim() !== m[1] + "=" && !line.trim().startsWith("#")) errors.push(".env.example has a non-empty value for " + m[1]);
    }
  }
  const findings = scanForSecrets(root, [".git", "node_modules", ".env.example"]);
  if (findings.length > 0) errors.push("secret assignments found: " + findings.map((s) => s.file + ":" + s.line).join(", "));
  if (errors.length > 0) return { ok: false, message: "secrets: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "secrets: OK — no secret assignments outside .env.example; .env.example values empty" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
