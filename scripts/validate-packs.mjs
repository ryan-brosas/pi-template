import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();
const REQUIRED_PACKS = ["delivery", "quality", "agents", "research"];

export function main() {
  const errors = [];
  const skillsRoot = join(root, ".pi", "skills");
  const packsDir = join(skillsRoot, "packs");
  const packs = existsSync(packsDir) ? readdirSync(packsDir).filter((n) => existsSync(join(packsDir, n))).sort() : [];
  for (const want of REQUIRED_PACKS) if (!packs.includes(want)) errors.push("missing pack: " + want);
  const assignment = {};
  const walkPack = (pack) => {
    const packDir = join(packsDir, pack);
    if (!existsSync(packDir)) return 0;
    let count = 0;
    for (const name of readdirSync(packDir)) {
      if (!existsSync(join(packDir, name, "SKILL.md"))) continue;
      if (assignment[name]) errors.push("skill assigned to multiple packs: " + name);
      assignment[name] = pack;
      count++;
    }
    return count;
  };
  const counts = {};
  for (const pack of packs) counts[pack] = walkPack(pack);
  const rootSkills = existsSync(skillsRoot)
    ? readdirSync(skillsRoot).filter((n) => existsSync(join(skillsRoot, n, "SKILL.md"))).sort()
    : [];
  if (!rootSkills.includes("pack-router")) errors.push("pack-router skill missing at .pi/skills/pack-router/SKILL.md");
  const total = Object.values(counts).reduce((a, b) => a + b, 0) + rootSkills.length;
  if (errors.length > 0) return { ok: false, message: "packs: FAIL\n  - " + errors.join("\n  - ") };
  const report = REQUIRED_PACKS.map((p) => p + "=" + (counts[p] ?? 0)).join(", ");
  return { ok: true, message: "packs: OK — " + report + " | root: " + rootSkills.join(", ") + " | " + total + " skills assigned exactly once" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}
