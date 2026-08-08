import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, sourcesFooter, loadManifest } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

function allRoots(manifest) {
  return Object.values(manifest.roots);
}

test("source-drift: every manifest source exists under a declared root", () => {
  const manifest = loadManifest(root);
  assert.ok(manifest.entries.length >= 24, "entries: " + manifest.entries.length);
  const roots = allRoots(manifest);
  for (const entry of manifest.entries) {
    assert.equal(existsSync(entry.source), true, entry.name + " source");
    assert.ok(roots.some((r0) => entry.source.startsWith(r0)), entry.name + " root");
  }
});

test("source-drift: vendored files match source + provenance footer (hash-checked)", () => {
  const manifest = loadManifest(root);
  for (const entry of manifest.entries) {
    const vendorPath = join(root, entry.vendorPath);
    assert.equal(existsSync(vendorPath), true, entry.name);
    const vendorText = readFileSync(vendorPath, "utf8");
    if (entry.synth) {
      assert.equal(entry.vendorSha256, sha256(vendorText), entry.name + " synth hash");
    } else {
      const expected = readFileSync(entry.source, "utf8") + sourcesFooter(entry.source, entry.license);
      assert.equal(vendorText, expected, entry.name + " must equal source + footer");
    }
  }
});

test("source-drift: provenance and exclusion policy documented with sync flow", () => {
  const doc = readFileSync(join(root, "docs", "sources.md"), "utf8");
  assert.match(doc, /Provenance/);
  assert.match(doc, /Exclusion policy/);
  assert.match(doc, /sync:sources/);
  assert.match(doc, /omniroute/);
  assert.match(doc, /legacy .*alias/i);
});
