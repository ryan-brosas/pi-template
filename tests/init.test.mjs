import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const prompt = readFileSync(join(root, ".pi", "prompts", "init.md"), "utf8");
const lower = prompt.toLowerCase();
const flat = lower.replace(/\s+/g, " ");

test("init: exposes exactly default and one --deep mode", () => {
  assert.match(prompt, /argument-hint: "\[--deep\]"/);
  assert.match(prompt, /\/init/);
  assert.match(prompt, /\/init --deep/);
  assert.match(flat, /reject every other flag/);
  assert.doesNotMatch(prompt, /--context|--user|--all/);
});

test("init: is an operational workflow, not a thin redirect", () => {
  for (const section of ["parse mode and establish scope", "idempotency and safety contract", "read-only discovery", "optional clarification interview", "preview before mutation", "executor write phase", "verification", "completion report"]) {
    assert.match(flat, new RegExp("## \\d*\\.?\\s*" + section.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), section);
  }
  assert.ok(prompt.length > 6000, "detailed initializer expected");
});

test("init: default and deep discovery are repository-aware", () => {
  assert.match(flat, /### default mode/);
  assert.match(flat, /### deep mode/);
  assert.match(flat, /codemap/);
  assert.match(flat, /context7/);
  assert.match(flat, /deepwiki/);
  assert.match(flat, /omniroute/);
  assert.match(flat, /never external-search local code/);
});

test("init: research and preview remain read-only until accepted handoff", () => {
  assert.match(flat, /discovery and preview are[^.]*read-only/);
  assert.match(flat, /schema-backed checklist/);
  assert.match(flat, /wait for accepted handoff/);
  assert.match(flat, /if acceptance is denied.*do not mutate/s);
});

test("init: declares the complete project artifact contract", () => {
  for (const p of ["AGENTS.md", "tech-stack.md", "architecture.md", "conventions.md", "commands.md", "research-baseline.md"]) assert.match(prompt, new RegExp(p.replace(".", "\\.")));
  assert.match(prompt, /\.pi\/project\//);
  assert.match(flat, /deep only/);
});

test("init: idempotency forbids blind overwrite and preserves maintainer notes", () => {
  assert.match(flat, /never overwrite blindly/);
  assert.match(flat, /preserve user[^.]*guidance/);
  assert.match(flat, /maintainer notes/);
  assert.match(flat, /show a proposed merge and ask/);
});



test("init: AGENTS baseline captures universal operating rules", () => {
  for (const phrase of ["user override", "no file deletion", "landing the plane", "sources/", "verified locally"]) assert.ok(flat.includes(phrase), phrase);
  assert.match(flat, /git reset --hard/);
  assert.match(flat, /do not narrate tool calls/);
  assert.match(flat, /before proposing a root cause/);
  assert.match(flat, /find all references and call sites/);
  assert.match(flat, /never put secrets in instructions/);
});

test("init: environment and completion rules are concrete", () => {
  assert.match(flat, /confirm the working directory/);
  assert.match(flat, /bash, fish, zsh/);
  assert.match(flat, /file issues for remaining work/);
  assert.match(flat, /run the project's quality gates/);
  assert.match(flat, /hand off context/);
});

test("init: verification checks scope, secrets, refs, and exact outcomes", () => {
  assert.match(prompt, /git diff --name-only/);
  assert.match(flat, /no runtime state or credentials/);
  assert.match(flat, /sample at least three architecture\/evidence refs/);
  assert.match(flat, /commands probed with exact outcomes/);
});

