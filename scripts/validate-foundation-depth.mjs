#!/usr/bin/env node
// Foundation evidence enforcement.
// References are optional and their size/count is never scored. Existing debt is
// regression-guarded; new or changed references must carry source anchors,
// provenance, a verification/probe signal, and no authoring-floor padding.
// See .pi/skills/pack-foundations/foundations-workflow/references/quality-bar.md.
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
const PROV_RES = [/read in full|source-grounded|graph-first|Codebase Memory|walked in full|Studied main-session|read in full by the forge worker/i];
const SCAFFOLD_RE = /\*\*(WHO|WHAT|WHEN|WHERE|WHY|HOW)\*\*/;
const PADDING_RE = /cross(?:es|ed|ing)? (?:the )?(?:standing )?(?:authoring )?floor|floor confirm(?:ation)?|(?:700[- ]line|10[- ]reference|ten reference).*(?:floor|minimum)|minimums, not caps/i;

function metric(text) {
  return {
    cites: cite(text).length,
    depth: DEPTH_RES.some((re) => re.test(text)) ? 1 : 0,
    prov: PROV_RES.some((re) => re.test(text)) ? 1 : 0,
    scaffold: SCAFFOLD_RE.test(text) ? 1 : 0,
    padding: PADDING_RE.test(text) ? 1 : 0,
  };
}
function deficits(m) {
  const d = [];
  if (m.cites < MIN_CITES) d.push("cites:" + m.cites);
  if (!m.depth) d.push("depth");
  if (!m.prov) d.push("prov");
  if (m.scaffold) d.push("scaffold");
  if (m.padding) d.push("padding");
  return d;
}

const leaves = readdirSync(foundationsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "foundations-workflow")
  .map((e) => e.name)
  .sort();

let ledger = {};
if (existsSync(debtFile)) ledger = JSON.parse(readFileSync(debtFile, "utf8"));

let debtcount = 0, regressions = 0, checked = 0;

for (const leaf of leaves) {
  const refsDir = join(foundationsDir, leaf, "references");
  const files = existsSync(refsDir)
    ? readdirSync(refsDir).filter((f) => f.endsWith(".md") && f !== "DEEP.md")
    : [];
  const leafIssues = [];
  for (const f of files) {
    const text = readFileSync(join(refsDir, f), "utf8");
    const m = metric(text);
    checked++;
    const ds = deficits(m);
    if (ds.length) leafIssues.push(f + " [" + ds.join(",") + "]");
  }
  const key = leaf;
  if (leafIssues.length) {
    const prior = ledger[key];
    if (regen) {
      ledger[key] = { status: "debt", issues: leafIssues };
      debtcount++;
      warn(key + ": " + leafIssues.join("; "));
      continue;
    }
    if (prior && prior.status === "debt") {
      const parse = (s) => {
        const m = s.match(/^([^ ]+) \[(.*)\]$/);
        if (!m) return { file: s, cites: 0, set: new Set() };
        const [file, inner] = [m[1], m[2]];
        let cites = 0; const set = new Set();
        for (const tok of inner.split(",")) {
          const cm = tok.match(/^cites:(\d+)$/);
          if (cm) cites = parseInt(cm[1], 10); else set.add(tok);
        }
        return { file, cites, set };
      };
      const priorParsed = prior.issues.map(parse);
      const worse = leafIssues.some((i) => {
        const cur = parse(i);
        const pm = priorParsed.find((p) => p.file === cur.file);
        if (!pm) return true;
        if (cur.cites < pm.cites && cur.set.has("cites")) return true;
        return [...cur.set].some((tok) => tok !== "cites" && !pm.set.has(tok));
      });
      if (worse) { regressions++; fail(key + " worsened: " + leafIssues.join("; ")); }
      else { debtcount++; warn("debt (tracked): " + key + " — " + leafIssues.length + " issues"); }
    } else {
      regressions++;
      fail(key + " below evidence bar (unacknowledged): " + leafIssues.join("; "));
    }
  } else {
    ok(key + ": meets the evidence bar");
    if (ledger[key]) delete ledger[key];
  }
}

if (regen) writeFileSync(debtFile, JSON.stringify(ledger, null, 2) + "\n");
if (regressions) fail(regressions + " regression(s) / unacknowledged deficits — add evidence before proceeding");
else if (debtcount) console.log("\n[warn] " + debtcount + " leaves carry tracked evidence debt; validator regresses nothing");
else ok("evidence bar clear across " + leaves.length + " leaves (" + checked + " references checked)");
