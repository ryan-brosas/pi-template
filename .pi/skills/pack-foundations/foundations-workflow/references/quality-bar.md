# Foundation quality bar: code-grounded shortcut utility

A foundation succeeds when another agent can retrieve and port proven code without rediscovering the repo. Source/tests are authoritative; a skill carries only the retrieval decision, the contract, and the behavioral boundary.

## The failure pattern
Volume targets create repeated summaries, invented taxonomies, stale copied code, and prose that hides the contract. Never score by length, count, citation count, or the amount of code copied in.

## The useful unit: an implementation capsule

A `<!-- capsule-v1 -->` reference answers one distinct porting question. It exposes Path/Symbol, Signature, Data Shape, Flow, Invariant, Probe, Retrieve (the capsule fields the validator checks for the marker). Include a short interface, state transition, or labelled pseudocode only when it prevents a likely wrong implementation. A reference does not duplicate a whole module.

## Evidence hierarchy
1. Current source + tests.
2. Fresh, covered graph symbols + high-confidence traces.
3. Source comments on non-obvious trade-offs.
4. Documentation/history for context.
The graph chooses what to inspect; source overrides it. Direct test reads are required for excluded paths.

## Behavior pressure test
Score 5 bars: right foundation, relevant primitive, exact retrieval target/coverage, preserved invariant/probe, no irrelevant loading. RED must expose a real miss; GREEN passes at 4/5 twice (incl. adversarial). No runner = record the block and use deterministic retrieval/probe checks; never fabricate a pass.

## Editorial checks
Claims beside anchors; code context labelled; constants only when load-bearing; no diaries/glossary/threshold commentary; no completeness claim beyond fresh, covered scope.
## Reference acceptance
Done when porting question, retrieval anchor, capsule, verdict, probe, provenance, coverage caveat are present. Removing any non-load-bearing text is welcome.