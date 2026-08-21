# The Quality Bar (localterm calibration)

Every foundation reference is held to the standard of `localterm-foundation/references/secret-defense.md`. This file shows what that means concretely: one anti-pattern (a real first-draft failure from the turso farm) against its corrected rendering, plus the dissolution technique and probe-mining rules.

## The anti-pattern (worker output transposed)

```markdown
- **WHO** Serves every reader (read_frame/read_frames_batch verify integrity via decode path)...
- **WHAT** A frame is 6 big-endian u32s (page_number, db_size, salt_1, salt_2, checksum_1, checksum_2 = 24 bytes)...
- **WHY** The cumulative chain makes any torn/garbage tail detectable at exactly the first bad frame...
- **LESSON** Chain integrity into the framing itself...
```

Why this fails even though every fact is correct:

- The 5W1H scaffold is MACHINERY made visible. The reader must reassemble prose from labeled fields — you shipped them a survey, not documentation.
- `P1 -`, `P2 -` numbering communicates nothing; concept names communicate intent.
- No narrative connective tissue: WHY a design exists should MOTIVATE the WHAT, not sit three bullets below it.
- It reads identically at every point — no emphasis hierarchy, no crown-jewel framing, no orientation for someone about to port code.

## The corrected rendering (same facts)

```markdown
## Frame format: a checksum chain seeded per generation

A frame is 24 bytes of header (six big-endian u32s: page_number, db_size,
salt_1, salt_2, checksum_1, checksum_2) followed by the page body.

The integrity story is a cumulative Fibonacci-weighted checksum: each
frame's checksum covers x[0..8] then the page body, seeded with the previous
frame's value, forming one unbroken chain from the 32-byte header:

> "s0 += x(i) + s1; s1 += x(i+1) + s0" -- and "The checksum values are always
> stored in the frame header in a big-endian format regardless of which byte
> order is used." (sqlite3_ondisk.rs:2190-2235)
```

What changed:

1. Section title states the CONCEPT and its payoff ("seeded per generation"), not an index.
2. Mechanics flow as sentences; anchors ride inline in parentheses where they land naturally.
3. Verbatim quotes become BLOCKQUOTES — the authors' own words carry authority.
4. WHO/WHAT dissolve into subject positions of sentences. WHEN becomes "when this triggers" inside the flow. WHERE becomes inline anchors. HOW stays as the mechanics paragraphs. WHY becomes the motivation sentence BEFORE the mechanics. LESSON and PROBE survive as explicit codas (**Lesson:** / **Probe:**) because those two are meant to be scannable.
5. One personality line per document is allowed (localterm: "the crown jewel"). Earn it; don't force it.

## Required per reference file

- Opening provenance line: files studied, line counts, how (full walk / sampled).
- Concept-named `##` sections in dependency order.
- Inline anchors (`file.rs:123-130`) on EVERY claim — verified, not estimated.
- At least one VERBATIM author comment per section (the inline whys are the gold).
- `**Lesson:**` coda per section: the portable principle in one sentence.
- `**Probe:**` coda per section mined from the repo's OWN tests (graph TESTS edges point to them).

## Required per SKILL.md

- Solves / When to use / Key skill-lines (actionable recipes naming exact paths) / Full view memory-graph block with real node counts / References list with one-line summaries / Skill Result Contract.
- An **unmined subsystems ledger**: large areas you did NOT study (e.g. mcp-ts-sdk's 2,376-line auth.ts), so future passes have a queue. Depth debt tracked, not hidden.

## Depth bar

A leaf meets the bar when its thinnest reference would not embarrass localterm's best. Practically: >=3 references for major repos (or 1 if single-primitive, written deep), every reference passing the checklist above, side-by-side comparison against localterm done BEFORE catalog wiring.
