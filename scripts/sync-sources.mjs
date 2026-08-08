// Vendors curated pi-core skills into .pi/skills with a provenance footer and
// records source/vendor sha256 hashes in sources/manifest.json. Workflow skills
// (synth) are hand-authored adapts and are verified, never overwritten.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sha256, sourcesFooter, loadManifest } from "./template-lib.ts";

const root = process.cwd();

export async function main() {
  const manifest = loadManifest(root);
  const lines = [];
  const errors = [];
  for (const entry of manifest.entries) {
    if (!existsSync(entry.source)) {
      errors.push("source missing: " + entry.source);
      continue;
    }
    const sourceText = readFileSync(entry.source, "utf8");
    entry.sourceSha256 = sha256(sourceText);
    const vendorPath = join(root, entry.vendorPath);
    if (entry.synth) {
      if (!existsSync(vendorPath)) {
        errors.push("synth vendor missing (create it first): " + entry.vendorPath);
        continue;
      }
      entry.vendorSha256 = sha256(readFileSync(vendorPath, "utf8"));
      lines.push("verified synth " + entry.name);
      continue;
    }
    const vendorText = sourceText + sourcesFooter(entry.source, entry.license);
    mkdirSync(dirname(vendorPath), { recursive: true });
    writeFileSync(vendorPath, vendorText);
    entry.vendorSha256 = sha256(vendorText);
    lines.push("vendored " + entry.name + " (" + sourceText.length + " chars)");
  }
  if (errors.length > 0) {
    return { ok: false, message: "sync: FAIL\n  - " + errors.join("\n  - ") };
  }
  writeFileSync(join(root, "sources", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { ok: true, message: "sync: OK — " + manifest.entries.length + " entries\n  " + lines.join("\n  ") };
}

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
if (isMain) {
  const r = await main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
