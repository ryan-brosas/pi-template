#!/usr/bin/env node
// Foundation depth enforcement (localterm bar).
// HARD FAIL on regression: any leaf whose per-file deficit metrics exceed the
// tracked debt ledger (foundation-depth-debt.json) fails the canonical check.
// Debt entries disappear as references are enriched. New files start at zero
// tolerance - new lazy content fails immediately.
// Signals calibrated on localterm-foundation (path/anchored citations, depth
// signals, provenance, no 5W1H scaffold). See
// .pi/skills/pack-foundations/foundations-workflow/references/quality-bar.md
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const regen = args.includes("--regen");
const root = args.find((a) => !a.startsWith("--")) ?? ".";
const foundationsDir = join(root, ".pi/skills/pack-foundations");
const debtFile = join(root, ".pi/skills/foundation-depth-debt.json");


const fail = (m) => { console.log("[fail] " + m); process.exitCode = 1; };
const ok = (m) => console.log("[ok] " + m);
const warn = (m) => console.log("[warn] " + m);

const EXT_RE = /\.(tsx?|rs|py|jsx?|json|cpp|hpp|scss|css|md|sql|toml|sh|log)$/;
const cite = (t) => (t.match(/`[^`]+`/g) ?? [])
  .map((s) => s.slice(1, -1))
  .filter((s) => EXT_RE.test(s) || /^[\w./-]+:\d/.test(s));
const MIN_CITES = 5;
const DEPTH_RES = [/^##\s+Verif/m, /(\.test\.|tests?\/|test-driven)/i, /^> /m, /(the lesson|\*\*Probe:)/i];
const PROV_RES = [/read in full|source-grounded|walked in full|Studied main-session|read in full by the forge worker/i];
const SCAFFOLD_RE = /\*\*(WHO|WHAT|WHEN|WHERE|WHY|HOW)\*\*/;
const MIN_REFS = 3;

function metric(text) {
  return {
    cites: cite(text).length,
    depth: DEPTH_RES.some((re) => re.test(text)) ? 1 : 0,
    prov: PROV_RES.some((re) => re.test(text)) ? 1 : 0,
    scaffold: SCAFFOLD_RE.test(text) ? 1 : 0,
  };
}
function deficits(m) {
  const d = [];
  if (m.cites < MIN_CITES) d.push("cites:" + m.cites);
  if (!m.depth) d.push("depth");
  if (!m.prov) d.push("prov");
  if (m.scaffold) d.push("scaffold");
  return d;
}

const leaves = readdirSync(foundationsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "foundations-workflow")
  .map((e) => e.name)
  .sort();

let ledger = {};
if (existsSync(debtFile)) ledger = JSON.parse(readFileSync(debtFile, "utf8"));

const live = {};
let debtcount = 0, regressions = 0, checked = 0;

for (const leaf of leaves) {
  const refsDir = join(foundationsDir, leaf, "references");
  if (!existsSync(refsDir)) { live[leaf] = { refCount: 0, files: {} }; continue; }
  const files = readdirSync(refsDir).filter((f) => f.endsWith(".md") && f !== "DEEP.md");
  live[leaf] = { refCount: files.length, files: {} };
  const leafIssues = [];
  if (files.length < MIN_REFS) leafIssues.push("refs:" + files.length);
  for (const f of files) {
    const text = readFileSync(join(refsDir, f), "utf8");
    const m = metric(text);
    checked++;
    live[leaf].files[f] = m;
    const ds = deficits(m);
    if (ds.length) leafIssues.push(f + " [" + ds.join(",") + "]");
  }
  const key = leaf;
  if (leafIssues.length) {
    const prior = ledger[key];
    const priorS = prior ? JSON.stringify(prior) : "";
    if (regen) {
      ledger[key] = { status: "debt", issues: leafIssues };
      debtcount++;
      warn(key + ": " + leafIssues.join("; "));
      continue;
    }
    const nowS = JSON.stringify(leafIssues);
    if (prior && prior.status === "debt") {
      // Regression check: any issue string that is new or worse
      const worse = leafIssues.length > prior.issues.length ||
        leafIssues.some((i) => !prior.issues.includes(i));
      if (worse) { regressions++; fail(key + " worsened: " + leafIssues.join("; ")); }
      else { debtcount++; warn("debt (tracked): " + key + " — " + leafIssues.length + " issues"); }
    } else {
      regressions++;
      fail(key + " below bar (unacknowledged): " + leafIssues.join("; "));
    }
    void priorS; void nowS;
  } else {
    ok(key + ": meets the depth bar");
    if (ledger[key]) delete ledger[key];
  }
}

if (regen) writeFileSync(debtFile, JSON.stringify(ledger, null, 2) + "\n");
if (regressions) fail(regressions + " regression(s) / unacknowledged deficits — enrich before proceeding");
else if (debtcount) console.log("\n[warn] " + debtcount + " leaves carry tracked debt; enrich to clear (validator regresses nothing)");
else ok("depth bar clear across " + leaves.length + " leaves (" + checked + " references checked)");
