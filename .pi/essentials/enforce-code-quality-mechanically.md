# Essential: Enforce Code Quality Mechanically, Not by Prompting

Source: Discord conversation with scarywood75 + Tom, 2026-07-19. The fourth
pillar of the operating philosophy. Treat as an essential.

## The core principle
**Anything that is mechanical/predictable/deterministic — create tests for it.**
The goal is to remove as much responsibility from the LLM as possible, because
the LLM tends to forget and makes mistakes.

## The rules
1. **Test the mechanical, deterministic things.**
   - Exposed functions not used elsewhere
   - Non-existent constants
   - Unused imports
   - Duplicate code (detect with semantic comparison: measure how far one
     function is from another; near-identical = duplicate)

2. **Use "quality packs."**
   - One universal quality pack that applies across all languages
   - Plus language-dependent quality packs

3. **Prompting for something mechanically enforceable is USELESS.**
   - Example: to force agents to use the web, create a GATE that does not allow
     them to go further until they've called the researcher agent.
   - Telling the agent to research by prompting does not consistently work,
     but the gate cannot be bypassed.

4. **"Given enough attempts, the LLM has no choice but to improve the code."**

## What this means for our setup
- This is Pillar 2 (steer outcomes, not behavior) made concrete: enforce
  outcomes mechanically (tests, gates, CI checks), not via prompting or
  restrictive prose.
- The structural-integrity check + autofix workflow we built ARE this pattern:
  mechanical, deterministic checks that CI enforces.
- The 7-gate foundations-workflow (RED/GREEN tests, coverage, parity) IS this:
  mechanical gates the agent must pass.
- For real code projects: add quality packs (universal + language-specific)
  and gates (e.g. "must call researcher before proceeding") rather than
  prompting for behavior.
