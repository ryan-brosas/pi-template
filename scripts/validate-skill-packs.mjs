#!/usr/bin/env node
// validate-skill-packs.mjs - zero-dependency structural gate for .pi/skills progressive-disclosure packs.
// Usage: node scripts/validate-skill-packs.mjs
// Fails (exit 1) on: unassigned leaves, duplicate primary membership, missing members,
// wrong visibility (routers/core hidden, leaves visible), and visible-metadata budget overflow.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = join(root, ".pi", "skills");
const catalogPath = join(skillsRoot, "packs.json");

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (entry.isFile() && entry.name === "SKILL.md") found.push(full);
  }
  return found;
}

function parse(file) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fields = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { file, rel: file.slice(skillsRoot.length + 1), name: fields.name || basename(dirname(file)), description: fields.description || "", disabled: String(fields["disable-model-invocation"]).toLowerCase() === "true" };
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (e) {
  console.error(`[fail] cannot read catalog ${catalogPath}: ${e.message}`);
  process.exit(1);
}

const errors = [];
const fail = (msg) => errors.push(msg);
const MAX_AUTO = catalog.maxAutoLoadedLeafSkills;
const BUDGET = catalog.maxVisibleMetadataTokens;
const core = Array.isArray(catalog.visibleCore) ? catalog.visibleCore : [];
const packs = Array.isArray(catalog.packs) ? catalog.packs : [];
if (typeof catalog.version !== "number") fail("catalog.version must be a number");
if (!Number.isInteger(MAX_AUTO) || MAX_AUTO < 1) fail("catalog.maxAutoLoadedLeafSkills must be an integer >= 1");
if (!Number.isInteger(BUDGET) || BUDGET < 1) fail("catalog.maxVisibleMetadataTokens must be an integer >= 1");
if (!packs.length) fail("catalog.packs must contain at least one pack");
for (const pack of packs) {
  if (!pack.id || !String(pack.id).startsWith("pack-")) fail(`pack missing id: ${JSON.stringify(pack).slice(0, 80)}`);
  if (!Array.isArray(pack.members)) fail(`pack ${pack.id} missing members array`);
}

const discovered = walk(skillsRoot).map(parse);
const routers = discovered.filter((s) => dirname(dirname(s.file)) === skillsRoot && basename(dirname(s.file)).startsWith("pack-"));
const leaves = discovered.filter((s) => !routers.includes(s));
const byName = new Map(discovered.map((s) => [s.name, s]));

for (const pack of packs) {
  for (const member of pack.members || []) {
    if (!byName.has(member)) fail(`missing member "${member}" declared by ${pack.id} (no such SKILL.md on disk)`);
  }
}
const memberOf = new Map();
for (const pack of packs) {
  for (const member of pack.members || []) {
    memberOf.set(member, [...(memberOf.get(member) || []), pack.id]);
  }
}
for (const [name, packsOf] of memberOf) {
  if (packsOf.length > 1) fail(`duplicate primary membership: "${name}" in ${packsOf.join(", ")} (exactly one pack)`);
}
for (const leaf of leaves) {
  const inPack = memberOf.get(leaf.name) || [];
  const inCore = core.includes(leaf.name);
  if (inPack.length === 0 && !inCore) fail(`unassigned leaf "${leaf.name}" at ${leaf.rel}: add it to exactly one pack in packs.json or to visibleCore`);
  if (inCore && inPack.length > 0) fail(`"${leaf.name}" is in visibleCore AND in a pack; choose one`);
}
for (const name of core) {
  if (!byName.has(name)) fail(`visibleCore entry "${name}" has no SKILL.md on disk`);
}

for (const r of routers) {
  if (r.disabled) fail(`pack router "${r.name}" must be model-visible (remove disable-model-invocation)`);
}
for (const name of core) {
  const s = byName.get(name);
  if (s && s.disabled) fail(`core skill "${name}" must be model-visible (remove disable-model-invocation)`);
}
for (const leaf of leaves) {
  if (!core.includes(leaf.name) && !leaf.disabled) fail(`leaf "${leaf.name}" at ${leaf.rel} is model-visible; add "disable-model-invocation: true" to its frontmatter`);
}

const visible = [...routers, ...core.map((n) => byName.get(n)).filter(Boolean)];
const metaChars = visible.reduce((n, s) => n + s.name.length + s.description.length, 0);
const metaTokens = Math.ceil(metaChars / 4);
if (metaTokens > BUDGET) fail(`visible metadata ${metaTokens} tokens exceeds budget ${BUDGET} (compact pack descriptions or hide more leaves)`);

if (errors.length) {
  console.error(`[fail] ${errors.length} skill-pack violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[ok] packs=${packs.length} members=${[...memberOf.keys()].length} core=${core.length} leaves=${leaves.length} routers=${routers.length} visible=${visible.length} metadata=${metaChars} chars (~${metaTokens} tokens) maxAuto=${MAX_AUTO} budget=${BUDGET}`);
