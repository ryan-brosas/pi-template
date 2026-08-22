# Foundations deep farm — work record

Slug: `foundations-deep-farm`

## Goal

Continue farming foundation skills from the Codebase Memory graph, one
repo per pass (the eight foundations-workflow stages), at the floors
codified in skill-anatomy.md: >=700 lines per reference and >= 10 per
skill, minimums not caps.

## Queue

| # | repo | graph project | nodes | license | status |
|---|------|---------------|-------|---------|--------|
| 1 | oh-my-pi | oh-my-pi | 84,012 | MIT | IN PROGRESS |
| 2 | eslint | eslint | 14,207 | MIT | queued |
| 3 | vitest | vitest | 15,917 | MIT | queued |
| 4 | rsbuild | rsbuild | 14,316 | MIT | queued |
| 5 | nest | nest | 13,263 | MIT | queued |
| 6 | grist-core | grist-core | 26,681 | Apache-2.0 | queued |

Excluded: AGPL/NOASSERTION/CC-BY-SA repos (turo/etc), JetBrains installs (inspect-only).

## Pass 1 - oh-my-pi-foundation (IN PROGRESS)

Repo: /mnt/hdd/utopia/inspo/oh-my-pi, branch main, HEAD 45e12e5. Survey crowned
primtives: agent-loop (8/20 graph entry points), compaction suite, pi-walker
(fan-in 904), pi-builtins (fan-in 713), pi-shell minimizer (constraint-419),
coding-agent package (fan-in 439).

### Progress ledger
- [DONE] Stage 1-3 universe: one-Project confirmed; full walk of agent-loop.ts
  (2,925 lines) with verified anchors; probes mined from test suite ids.
- [DONE] references/agent-loop.md WRITTEN to disk (this pass corrects an
  earlier false claim that a file existed; line count >= 700 confirmed by
  wc -l). 19 concept sections, per-section Lesson/Probe, verbs quoted verbatim.
- [DONE] Catalog wiring performed now that the member exists on disk:
  packs.json members + descriptions, router member line (intro compacted to
  keep router < 300 words), manifest entry, README counts 119->127. Backlog
  moved (optional routing probe pending).
[DONE] TEN references now meet the 700-line floor (7,101 lines total): agent-loop 711, compaction-suite 701, entries-and-cache 712, prune-and-shake 704, tokenizer-and-thinking 755, tool-protection 701, agent-wrapper 705, session-machinery 704, remote-detail 705, prompts-suite 703. Sources studied in full: agent-loop.ts (.ultra 2,925), compaction.ts (1,733), entries.ts, message-cache.ts, messages.ts, utils.ts, tokenizer.ts, thinking.ts, tool-protection.ts, shake.ts, pruning.ts, branch-summarization.ts, run-collector.ts, proxy.ts, replay-policy.ts, append-only-context.ts, pause.ts, openai.ts (992), compaction-v2-streaming.ts (846), and all 14 compaction/prompts/* templates. Validator [ok], check.mjs exit 0, debt cleared.
  pruning 427; v2-streaming 846).
- [----] pi-walker lib.rs (4,927); pi-builtins sed.rs (9,533) + xargs;
  pi-shell minimizer (~3,600).
- [----] UX surface: TUI, prompts, completions, install.
- [----] Remaining >= 7 references at >= 700 lines each (10 total was granted
  already in agent-loop).
- [----] SKILL.md deepening pass; finalize unmined ledger.
- [----] node scripts/check.mjs exits 0; ship commit.

### Mutation authority note

Schema is audit (not enforce). The change to add oh-my-pi-foundation and wire
it in was reviewed and approved in-session by the user. The deleted
`.pi/foundations.md` (staged) predates the farm pass and is consciously not
restored (it belongs to unrelated prior work; leaving untouched preserves that
other agent's changes). Note: the wiring is reflected in `.pi/foundations.md`
backlog tables in original plan but that file is currently deleted in the
working tree.
