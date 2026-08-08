import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PACKS = ["delivery", "quality", "agents", "research"];

function discover(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (existsSync(join(full, "SKILL.md"))) out.push(full);
      else out.push(...discover(full));
    }
  }
  return out;
}

test("skill-packs: recursive discovery finds pack skills under nested dirs", () => {
  const found = discover(join(root, ".pi", "skills"));
  assert.ok(found.length >= 20, "found " + found.length);
  for (const p of found) assert.match(p, /\.pi[\\/]skills[\\/](packs[\\/][a-z-]+[\\/][a-z0-9-]+|[a-z-]+)$/, p);
});

test("skill-packs: four required packs each contain skills", () => {
  const packsDir = join(root, ".pi", "skills", "packs");
  for (const pack of PACKS) {
    const packDir = join(packsDir, pack);
    assert.equal(existsSync(packDir), true, pack);
    const names = readdirSync(packDir).filter((n) => existsSync(join(packDir, n, "SKILL.md")));
    assert.ok(names.length >= 1, pack + " empty");
  }
});

test("skill-packs: every pack skill is assigned to exactly one pack", () => {
  const seen = {};
  const packsDir = join(root, ".pi", "skills", "packs");
  for (const pack of readdirSync(packsDir)) {
    for (const name of readdirSync(join(packsDir, pack))) {
      if (!existsSync(join(packsDir, pack, name, "SKILL.md"))) continue;
      assert.equal(seen[name], undefined, name + " assigned twice");
      seen[name] = pack;
    }
  }
});

test("skill-packs: pack-router guides /skill:pack-router research triggering", () => {
  const p = join(root, ".pi", "skills", "pack-router", "SKILL.md");
  assert.equal(existsSync(p), true);
  const text = readFileSync(p, "utf8");
  assert.match(text, /\/skill:pack-router research/);
  assert.match(text, /\/skill:<name>/);
  assert.match(text, /research/);
});

test("skill-packs: pack skills keep valid frontmatter and provenance", () => {
  const packsDir = join(root, ".pi", "skills", "packs");
  for (const pack of readdirSync(packsDir)) {
    for (const name of readdirSync(join(packsDir, pack))) {
      const p = join(packsDir, pack, name, "SKILL.md");
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8");
      assert.match(text, /^---\nname:/m, name);
      assert.match(text, /^description:/m, name);
      assert.match(text, /source: \/home\/ryanj\//, name);
    }
  }
});
