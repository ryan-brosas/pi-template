import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const here = fileURLToPath(import.meta.url);
const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === here;
const root = process.cwd();

const SKILLS = ["research-router", "omniroute-research", "context7-docs", "deepwiki-repositories"];
const SECTIONS = ["when to use", "when not to use", "tool contract", "workflow", "evidence contract", "failure recovery", "stop conditions"];
const REFS = [
  "mcp.$search",
  "mcp.exa.omniroute_web_search",
  "mcp.exa.omniroute_web_fetch",
  "mcp.context7.query-docs",
  "mcp.deepwiki.read_wiki_contents",
  "mcp.deepwiki.ask_question",
];
const SEARCH_PROVIDERS = ["serper-search", "brave-search", "perplexity-search", "exa-search", "tavily-search", "google-pse-search", "linkup-search", "searchapi-search", "searxng-search"];
const FETCH_PROVIDERS = ["firecrawl", "jina-reader", "tavily-search", "tinyfish"];
const OMNI_FIELDS = ["max_results", "search_type", "include_metadata", "wait_for_selector", "screenshot_url", "markdown", "screenshot", "cached", "queries_used"];

export function main() {
  const errors = [];
  const packDir = join(root, ".pi", "skills", "packs", "research");
  let allText = "";
  for (const skill of SKILLS) {
    const p = join(packDir, skill, "SKILL.md");
    if (!existsSync(p)) {
      errors.push("missing research skill: " + skill);
      continue;
    }
    const text = readFileSync(p, "utf8").toLowerCase();
    allText += text;
    for (const section of SECTIONS) if (!text.includes("## " + section)) errors.push(skill + ": missing section " + section);
  }
  for (const ref of REFS) if (!allText.includes(ref)) errors.push("expected ref missing across research pack: " + ref);
  const omni = readFileSync(join(packDir, "omniroute-research", "SKILL.md"), "utf8").toLowerCase();
  if (!omni.includes("primary general-web")) errors.push("omniroute must be stated as primary general-web lane");
  for (const prov of SEARCH_PROVIDERS) if (!omni.includes(prov)) errors.push("omniroute search provider missing: " + prov);
  for (const prov of FETCH_PROVIDERS) if (!omni.includes(prov)) errors.push("omniroute fetch provider missing: " + prov);
  for (const field of OMNI_FIELDS) if (!omni.includes(field)) errors.push("omniroute schema field missing: " + field);
  const router = readFileSync(join(packDir, "research-router", "SKILL.md"), "utf8").toLowerCase();
  if (!router.includes("library-docs") || !router.includes("repo-qa") || !router.includes("general-web")) errors.push("router must define all three lanes");
  if (errors.length > 0) return { ok: false, message: "research: FAIL\n  - " + errors.join("\n  - ") };
  return { ok: true, message: "research: OK — " + SKILLS.length + " detailed skills, 7 sections, all refs, " + SEARCH_PROVIDERS.length + " search providers, " + FETCH_PROVIDERS.length + " fetch providers, full schema fields, omniroute primary" };
}

if (isMain) {
  const r = main();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}

