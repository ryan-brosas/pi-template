import { spawnSync } from "node:child_process";

const checks = [
  [process.execPath, ["scripts/validate-skill-packs.mjs"]],
  [process.execPath, ["scripts/sync-skill-manifest.mjs", "--check"]],
  [process.execPath, ["scripts/probe-skill-routing.mjs"]],
  [process.execPath, ["scripts/validate-pi-fabric.mjs"]],
  [process.execPath, ["scripts/validate-work-management.mjs"]],
  [process.execPath, ["scripts/validate-notion-workspace-skill.mjs"]],
  [process.execPath, ["scripts/validate-foundation-depth.mjs"]],
  [process.execPath, ["scripts/probe-foundation-squeeze.mjs"]],
  [process.execPath, ["scripts/validate-release-hygiene.mjs"]],
  ["git", ["diff", "--check"]],
];

for (const [command, args] of checks) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Commit-convention gate (adopted from sst/opencode AGENTS.md, MIT).
// Checks only commits not yet on origin/main, plus the branch name on pull
// requests and feature branches. Skips when origin/main is unavailable.
const subjectRe = /^(feat|fix|docs|chore|refactor|test)(\([a-z0-9-]+\))?: .+/;
const branchRe = /^(main|master)$|^[a-z0-9]+(-[a-z0-9]+){0,2}$/;
console.log("\n> commit-convention gate (unpushed commits only)");
if (spawnSync("git", ["rev-parse", "--verify", "origin/main"], { cwd: process.cwd(), stdio: "ignore" }).status !== 0) {
  console.log("[ok] no origin/main ref; gate skipped");
} else {
  const subjects = spawnSync("git", ["log", "--format=%s", "--no-merges", "origin/main..HEAD"], { cwd: process.cwd(), encoding: "utf8" })
    .stdout.trim().split("\n").filter(Boolean);
  if (subjects.length === 0) {
    console.log("[ok] no unpushed commits");
  } else {
    let bad = 0;
    for (const s of subjects) {
      if (subjectRe.test(s)) console.log("[ok] " + s.slice(0, 72));
      else { console.log("[fail] subject not conventional: " + s.slice(0, 72)); bad++; }
    }
    if (bad) process.exit(1);
  }
  const branch = process.env.GITHUB_HEAD_REF ||
    spawnSync("git", ["branch", "--show-current"], { cwd: process.cwd(), encoding: "utf8" }).stdout.trim();
  if (branch && !branchRe.test(branch)) {
    console.log("[fail] branch name '" + branch + "' violates convention (at most three hyphen-separated lowercase words, no slashes, no type prefixes)");
    process.exit(1);
  } else if (branch) console.log("[ok] branch name: " + branch);
}

console.log("\nrepository check: ok");
