import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { researchIntent, buildResearchGuidance, FALLBACK_MCP_SEARCH } from "../scripts/template-lib.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const EMPTY = {};

const CASES = [
  ["react hooks api documentation", "library-docs", "context7"],
  ["how is the astro repository organized", "repo-qa", "deepwiki"],
  ["current news about ai agents", "general-web", "omniroute"],
  ["what does the gitlab repo do", "repo-qa", "deepwiki"],
  ["stripe api reference", "library-docs", "context7"],
];

test("research-routing: intent table routes all lanes deterministically", () => {
  for (const [q, lane, provider] of CASES) {
    const r = researchIntent(q);
    assert.equal(r.lane, lane, q);
    assert.equal(r.provider, provider, q);
  }
});

test("research-routing: guidance falls back to generic mcp.$search and never fabricates", () => {
  const g = buildResearchGuidance(EMPTY, { intent: "react hooks api" });
  assert.match(g.guidance, /mcp\.\$search/);
  assert.equal(/dispatch[- ]ready/i.test(g.guidance), false);
  assert.equal(g.lane.fallback.includes(FALLBACK_MCP_SEARCH), true);
});

test("research-routing: research pack skills carry exact refs and stop conditions", () => {
  const base = join(root, ".pi", "skills", "packs", "research");
  for (const name of ["research-router", "omniroute-research", "context7-docs", "deepwiki-repositories"]) {
    const text = readFileSync(join(base, name, "SKILL.md"), "utf8").toLowerCase();
    assert.match(text, /## stop conditions/, name);
    assert.match(text, /## tool contract/, name);
    assert.match(text, /## evidence contract/, name);
  }
});

test("research-routing: read-only and prewalk-compliant across the pack", () => {
  const router = readFileSync(join(root, ".pi", "skills", "packs", "research", "research-router", "SKILL.md"), "utf8").toLowerCase();
  assert.match(router, /read-only/);
  assert.match(router, /prewalk/);
  assert.match(router, /never fabricate/);
});
