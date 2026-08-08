import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256, sourcesFooter, loadManifest } from "./template-lib.ts";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

export function main() {
  const errors = [];
  let manifest;
  try {
    manifest = loadManifest(root);
  } catch (err) {
    return { ok: false, message: "sources: FAIL\n  - " + (err instanceof Error ? err.message : String(err)) };
  }
  for (const entry of manifest.entries) {
    if (!existsSync(entry.source)) {
      errors.push(entry.name + ": source missing " + entry.source);
      continue;
    }
    const sourceText = readFileSync(entry.source, "utf8");
    const sourceSha = sha256(sourceText);
    if (entry.sourceSha256 && entry.sourceSha256 !== sourceSha) errors.push(entry.name + ": source drifted (sha " + entry.sourceSha256.slice(0, 8) + " != " + sourceSha.slice(0, 8) + ")");
    const vendorPath = join(root, entry.vendorPath);
    if (!existsSync(vendorPath)) {
      errors.push(entry.name + ": vendor missing " + entry.vendorPath);
      continue;
    }
    const vendorText = readFileSync(vendorPath, "utf8");
    if (entry.synth) {
      const vSha = sha256(vendorText);
      if (entry.vendorSha256 && entry.vendorSha256 !== vSha) errors.push(entry.name + ": synth vendor drifted (" + entry.vendorSha256.slice(0, 8) + " != " + vSha.slice(0, 8) + ")");
    } else {
      const expected = sourceText + sourcesFooter(entry.source, entry.license);
      if (vendorText !== expected) errors.push(entry.name + ": vendor does not match source+footer (run npm run sync:sources)");
    }
  }
  if (!existsSync(join(root, "docs", "sources.md"))) errors.push("docs/sources.md missing (provenance + exclusion policy)");
  if (errors.length > 0) return { ok: false, message: "sources: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "sources: OK — " + manifest.entries.length + " entries verified; docs/sources.md present" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
