// Usage: node scripts/sync-skill-manifest.mjs [--check]
// Regenerates .pi/skills/manifest.json from .pi/skills/packs.json and the
// discovered SKILL.md tree. Deterministic: entries sorted by name. The removed
// ledger is preserved verbatim. With --check, exits 1 on drift without writing.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = join(root, ".pi", "skills");
const catalogPath = join(skillsRoot, "packs.json");
const manifestPath = join(skillsRoot, "manifest.json");
const check = process.argv.includes("--check");

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
  const name = m ? (m[1].split("\n").find((l) => l.startsWith("name:")) || "").slice(5).trim() : "";
  return { file, name: name || basename(dirname(file)) };
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (e) {
  console.error(`[fail] cannot read catalog ${catalogPath}: ${e.message}`);
  process.exit(1);
}
const core = new Set(catalog.visibleCore || []);
const packOf = new Map();
for (const pack of catalog.packs || []) for (const m of pack.members || []) packOf.set(m, pack.id);
const discovered = walk(skillsRoot).map(parse);
const isRouter = (s) => dirname(dirname(s.file)) === skillsRoot && basename(dirname(s.file)).startsWith("pack-");

const retained = discovered
  .filter((s) => !isRouter(s))
  .map((s) => ({
    name: s.name,
    status: "retained",
    pack: core.has(s.name) ? "core" : packOf.get(s.name),
    modelVisible: core.has(s.name),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const REMOVED = [
  { name: "memory", reason: "duplicates Pi native memory/sessions (memory.recall, docs/sessions.md)" },
  { name: "diagnostics", reason: "wraps removed OpenCode diagnostics tool + aislop/fallow custom tools (plugin/ removed)" },
  { name: "subagent-driven-development", reason: "OpenCode task() subagent dispatch; superseded by Ultra Fabric agents/handoff" },
].sort((a, b) => a.name.localeCompare(b.name));

const generated = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Skill ledger for the Pi-tailored template. Skills are organized into progressive-disclosure packs: ten visible pack routers, four always-visible core safety skills, and hidden leaves loaded on demand. Membership is owned by .pi/skills/packs.json; node scripts/validate-skill-packs.mjs is the structural gate.",
  removed: REMOVED,
  retained,
};
const text = JSON.stringify(generated, null, 2) + "\n";
const current = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
if (current === text) {
  console.log("[ok] manifest is current");
  process.exit(0);
}
if (check) {
  console.error("[fail] manifest drift: run node scripts/sync-skill-manifest.mjs to regenerate");
  process.exit(1);
}
writeFileSync(manifestPath, text);
console.log("[ok] regenerated manifest.json");
