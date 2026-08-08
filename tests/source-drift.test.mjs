import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, sourcesFooter, loadManifest } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

test("source-drift: every manifest source exists in pi-core or opencode-template", () => {
  const manifest = loadManifest(root);
  assert.ok(manifest.entries.length >= 19, "entries: " + manifest.entries.length);
  for (const entry of manifest.entries) {
    assert.equal(existsSync(entry.source), true, entry.name + " source");
    assert.ok(
      entry.source.startsWith(manifest.roots["pi-core"]) || entry.source.startsWith(manifest.roots["opencode-template"]),
      entry.name + " root",
    );
  }
});

test("source-drift: vendored files match source + provenance footer (hash-checked)", () => {
  const manifest = loadManifest(root);
  for (const entry of manifest.entries) {
    const vendorPath = join(root, entry.vendorPath);
    assert.equal(existsSync(vendorPath), true, entry.name);
    const vendorText = readFileSync(vendorPath, "utf8");
    const vSha = sha256(vendorText);
    if (entry.synth) {
      assert.equal(entry.vendorSha256, vSha, entry.name + " synth vendor hash");
    } else {
      const expected = readFileSync(entry.source, "utf8") + sourcesFooter(entry.source, entry.license);
      assert.equal(vendorText, expected, entry.name + " must equal source + footer");
    }
  }
});

test("source-drift: provenance and exclusion policy documented", () => {
  const doc = readFileSync(join(root, "docs", "sources.md"), "utf8");
  assert.match(doc, /Provenance/);
  assert.match(doc, /Exclusion policy/);
  assert.match(doc, /sync:sources/);
});
